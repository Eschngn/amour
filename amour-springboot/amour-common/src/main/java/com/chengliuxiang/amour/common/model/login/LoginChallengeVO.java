package com.chengliuxiang.amour.common.model.login;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginChallengeVO {

    private String challengeId;

    /** X.509 SubjectPublicKeyInfo DER，经 Base64 编码。 */
    private String publicKey;

    private String algorithm;

    private long expiresInSeconds;
}
