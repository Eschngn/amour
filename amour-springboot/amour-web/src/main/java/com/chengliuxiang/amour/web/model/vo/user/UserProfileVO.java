package com.chengliuxiang.amour.web.model.vo.user;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileVO {
    private String username;
    private String displayName;
    private String avatar;
    private boolean passwordSet;
    private LocalDateTime usernameChangeAvailableAt;
    private Set<String> permissions;
}
