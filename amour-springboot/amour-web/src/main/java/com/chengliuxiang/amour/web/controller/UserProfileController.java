package com.chengliuxiang.amour.web.controller;

import com.chengliuxiang.amour.common.aspect.ApiOperationLog;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.user.ChangePasswordReqVO;
import com.chengliuxiang.amour.web.model.vo.user.UpdateUserProfileReqVO;
import com.chengliuxiang.amour.web.model.vo.user.UserProfileVO;
import com.chengliuxiang.amour.web.service.UserProfileService;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import javax.annotation.Resource;

@RestController
@RequestMapping("/user")
public class UserProfileController {

    @Resource
    private UserProfileService userProfileService;

    @PostMapping("/profile")
    public Response<UserProfileVO> getProfile() {
        return userProfileService.getProfile();
    }

    @PostMapping("/profile/update")
    @ApiOperationLog(description = "修改个人资料")
    public Response<UserProfileVO> updateProfile(
            @RequestBody @Validated UpdateUserProfileReqVO reqVO) {
        return userProfileService.updateProfile(reqVO);
    }

    @PostMapping("/profile/avatar")
    @ApiOperationLog(description = "修改用户头像")
    public Response<UserProfileVO> uploadAvatar(@RequestParam("file") MultipartFile file) {
        return userProfileService.uploadAvatar(file);
    }

    @PostMapping("/password/change")
    @ApiOperationLog(description = "修改密码")
    public Response<Void> changePassword(@RequestBody @Validated ChangePasswordReqVO reqVO) {
        return userProfileService.changePassword(reqVO);
    }
}
