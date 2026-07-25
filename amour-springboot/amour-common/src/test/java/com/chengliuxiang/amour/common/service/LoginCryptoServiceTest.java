package com.chengliuxiang.amour.common.service;

import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.model.login.LoginChallengeVO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.Cipher;
import javax.crypto.spec.OAEPParameterSpec;
import javax.crypto.spec.PSource;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.spec.MGF1ParameterSpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class LoginCryptoServiceTest {

    private LoginCryptoService loginCryptoService;
    private StringRedisTemplate redisTemplate;

    @BeforeEach
    void setUp() {
        loginCryptoService = new LoginCryptoService();
        redisTemplate = mock(StringRedisTemplate.class);
        @SuppressWarnings("unchecked")
        ValueOperations<String, String> valueOperations = mock(ValueOperations.class);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        ReflectionTestUtils.setField(loginCryptoService, "stringRedisTemplate", redisTemplate);
        ReflectionTestUtils.setField(loginCryptoService, "configuredPublicKey", "");
        ReflectionTestUtils.setField(loginCryptoService, "configuredPrivateKey", "");
        loginCryptoService.initializeKeys();
    }

    @Test
    void shouldDecryptBrowserCompatibleRsaOaepCipherTextOnlyOnce() throws Exception {
        LoginChallengeVO challenge = loginCryptoService.createChallenge();
        String expectedPassword = "p@ssword-登录";
        String encryptedPassword = encrypt(challenge.getPublicKey(), expectedPassword);

        when(redisTemplate.execute(any(RedisScript.class), any(List.class)))
                .thenReturn("1", (String) null);

        assertEquals(expectedPassword,
                loginCryptoService.decryptPassword(challenge.getChallengeId(), encryptedPassword));
        assertThrows(BizException.class,
                () -> loginCryptoService.decryptPassword(challenge.getChallengeId(), encryptedPassword));
    }

    private String encrypt(String publicKeyBase64, String password) throws Exception {
        byte[] encodedKey = Base64.getDecoder().decode(publicKeyBase64);
        PublicKey publicKey = KeyFactory.getInstance("RSA")
                .generatePublic(new X509EncodedKeySpec(encodedKey));
        OAEPParameterSpec oaepParameterSpec = new OAEPParameterSpec(
                "SHA-256", "MGF1", MGF1ParameterSpec.SHA256, PSource.PSpecified.DEFAULT);
        Cipher cipher = Cipher.getInstance("RSA/ECB/OAEPWithSHA-256AndMGF1Padding");
        cipher.init(Cipher.ENCRYPT_MODE, publicKey, oaepParameterSpec);
        return Base64.getEncoder().encodeToString(
                cipher.doFinal(password.getBytes(StandardCharsets.UTF_8)));
    }
}
