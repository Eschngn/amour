package com.chengliuxiang.amour.common.service;

import com.chengliuxiang.amour.common.constant.RedisKeyConstants;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.model.login.LoginChallengeVO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import javax.annotation.Resource;
import javax.crypto.Cipher;
import javax.crypto.spec.OAEPParameterSpec;
import javax.crypto.spec.PSource;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.spec.MGF1ParameterSpec;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.time.Duration;
import java.util.Base64;
import java.util.Collections;
import java.util.UUID;

/**
 * 登录密码的应用层加密服务。
 *
 * <p>浏览器使用 RSA-OAEP(SHA-256) 加密密码；挑战只能消费一次，避免截获的密文被重复使用。
 * 该机制用于减少密码出现在请求体和链路日志中的风险，但生产环境仍必须使用 HTTPS。</p>
 */
@Service
@Slf4j
public class LoginCryptoService {

    public static final String ALGORITHM = "RSA-OAEP-256";
    public static final long CHALLENGE_TTL_SECONDS = 120L;
    public static final int MAX_PASSWORD_BYTES = 128;

    private static final String CIPHER_TRANSFORMATION = "RSA/ECB/OAEPWithSHA-256AndMGF1Padding";
    private static final OAEPParameterSpec OAEP_SHA_256 = new OAEPParameterSpec(
            "SHA-256", "MGF1", MGF1ParameterSpec.SHA256, PSource.PSpecified.DEFAULT);
    private static final DefaultRedisScript<String> CONSUME_CHALLENGE_SCRIPT =
            new DefaultRedisScript<>(
                    "local value = redis.call('GET', KEYS[1]); "
                            + "if value then redis.call('DEL', KEYS[1]); end; "
                            + "return value;",
                    String.class);

    @Resource
    private StringRedisTemplate stringRedisTemplate;

    @Value("${amour.security.login-rsa.public-key:}")
    private String configuredPublicKey;

    @Value("${amour.security.login-rsa.private-key:}")
    private String configuredPrivateKey;

    private PublicKey publicKey;
    private PrivateKey privateKey;
    private String publicKeyBase64;

    @PostConstruct
    public void initializeKeys() {
        try {
            boolean hasPublicKey = hasText(configuredPublicKey);
            boolean hasPrivateKey = hasText(configuredPrivateKey);
            if (hasPublicKey != hasPrivateKey) {
                throw new IllegalStateException("登录 RSA 公钥和私钥必须同时配置");
            }

            if (hasPublicKey) {
                KeyFactory keyFactory = KeyFactory.getInstance("RSA");
                publicKey = keyFactory.generatePublic(new X509EncodedKeySpec(decodePem(configuredPublicKey)));
                privateKey = keyFactory.generatePrivate(new PKCS8EncodedKeySpec(decodePem(configuredPrivateKey)));
                log.info("已加载配置的登录 RSA 密钥");
            } else {
                KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
                generator.initialize(2048);
                KeyPair keyPair = generator.generateKeyPair();
                publicKey = keyPair.getPublic();
                privateKey = keyPair.getPrivate();
                log.warn("未配置登录 RSA 密钥，已生成临时密钥；多实例或重启场景请通过 "
                        + "amour.security.login-rsa.public-key/private-key 配置同一组密钥");
            }
            publicKeyBase64 = Base64.getEncoder().encodeToString(publicKey.getEncoded());
        } catch (Exception e) {
            throw new IllegalStateException("初始化登录 RSA 密钥失败", e);
        }
    }

    public LoginChallengeVO createChallenge() {
        String challengeId = UUID.randomUUID().toString();
        String redisKey = RedisKeyConstants.buildLoginChallengeKey(challengeId);
        stringRedisTemplate.opsForValue().set(redisKey, "1", Duration.ofSeconds(CHALLENGE_TTL_SECONDS));
        return LoginChallengeVO.builder()
                .challengeId(challengeId)
                .publicKey(publicKeyBase64)
                .algorithm(ALGORITHM)
                .expiresInSeconds(CHALLENGE_TTL_SECONDS)
                .build();
    }

    /**
     * 消费一次性挑战并解密密码。任何失败都返回统一错误，避免暴露密码学实现细节。
     */
    public String decryptPassword(String challengeId, String encryptedPassword) {
        consumeChallenge(challengeId);
        try {
            byte[] cipherText = Base64.getDecoder().decode(encryptedPassword);
            Cipher cipher = Cipher.getInstance(CIPHER_TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, privateKey, OAEP_SHA_256);
            byte[] plainText = cipher.doFinal(cipherText);
            if (plainText.length == 0 || plainText.length > MAX_PASSWORD_BYTES) {
                throw new IllegalArgumentException("密码长度非法");
            }
            return new String(plainText, StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.warn("登录密码密文解密失败");
            throw new BizException(ResponseCodeEnum.LOGIN_CHALLENGE_INVALID);
        }
    }

    private void consumeChallenge(String challengeId) {
        if (!hasText(challengeId)) {
            throw new BizException(ResponseCodeEnum.LOGIN_CHALLENGE_INVALID);
        }
        String redisKey = RedisKeyConstants.buildLoginChallengeKey(challengeId);
        String value = stringRedisTemplate.execute(
                CONSUME_CHALLENGE_SCRIPT, Collections.singletonList(redisKey));
        if (value == null) {
            throw new BizException(ResponseCodeEnum.LOGIN_CHALLENGE_INVALID);
        }
    }

    private byte[] decodePem(String value) {
        String normalized = value
                .replace("-----BEGIN PUBLIC KEY-----", "")
                .replace("-----END PUBLIC KEY-----", "")
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replaceAll("\\s", "");
        return Base64.getDecoder().decode(normalized);
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
