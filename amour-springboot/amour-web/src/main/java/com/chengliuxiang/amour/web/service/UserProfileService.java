package com.chengliuxiang.amour.web.service;

import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.user.ChangePasswordReqVO;
import com.chengliuxiang.amour.web.model.vo.user.UpdateUserProfileReqVO;
import com.chengliuxiang.amour.web.model.vo.user.UserProfileVO;
import org.springframework.web.multipart.MultipartFile;

public interface UserProfileService {
    Response<UserProfileVO> getProfile();

    Response<UserProfileVO> updateProfile(UpdateUserProfileReqVO reqVO);

    Response<UserProfileVO> uploadAvatar(MultipartFile file);

    Response<Void> changePassword(ChangePasswordReqVO reqVO);
}
