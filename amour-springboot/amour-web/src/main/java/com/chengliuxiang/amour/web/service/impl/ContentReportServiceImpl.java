package com.chengliuxiang.amour.web.service.impl;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.util.StrUtil;
import com.chengliuxiang.amour.common.constant.ContentGovernanceConstants;
import com.chengliuxiang.amour.common.domain.dos.AnniversaryDO;
import com.chengliuxiang.amour.common.domain.dos.ContentReportDO;
import com.chengliuxiang.amour.common.domain.dos.CoupleSpaceDO;
import com.chengliuxiang.amour.common.domain.dos.PhotoDO;
import com.chengliuxiang.amour.common.domain.dos.StoryNodeDO;
import com.chengliuxiang.amour.common.domain.mapper.AnniversaryMapper;
import com.chengliuxiang.amour.common.domain.mapper.ContentReportMapper;
import com.chengliuxiang.amour.common.domain.mapper.CoupleSpaceMapper;
import com.chengliuxiang.amour.common.domain.mapper.PhotoMapper;
import com.chengliuxiang.amour.common.domain.mapper.StoryNodeMapper;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.report.ContentReportSubmitReqVO;
import com.chengliuxiang.amour.web.service.ContentReportService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;
import java.time.LocalDateTime;

/**
 * 用户端举报提交。
 *
 * <p>只允许举报已公开到恋爱广场的空间或内容；私密内容、隐藏内容、冻结/归档空间一律
 * 返回统一的“只能举报公开内容”，避免通过举报接口探测他人私密数据。</p>
 */
@Service
public class ContentReportServiceImpl implements ContentReportService {

    private static final int MAX_REPORTS_PER_DAY = 10;

    @Resource
    private ContentReportMapper contentReportMapper;
    @Resource
    private CoupleSpaceMapper coupleSpaceMapper;
    @Resource
    private StoryNodeMapper storyNodeMapper;
    @Resource
    private PhotoMapper photoMapper;
    @Resource
    private AnniversaryMapper anniversaryMapper;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<Long> submit(ContentReportSubmitReqVO reqVO) {
        Long reporterUserId = StpUtil.getLoginIdAsLong();
        String contentType = StrUtil.trim(reqVO.getContentType());
        if (!ContentGovernanceConstants.isSupportedReportType(contentType)) {
            throw new BizException(ResponseCodeEnum.CONTENT_TYPE_NOT_SUPPORTED);
        }
        String reason = StrUtil.trim(reqVO.getReason());
        if (StrUtil.isBlank(reason) || reason.length() > 1000) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }

        Long spaceId = resolveReportableSpaceId(contentType, reqVO.getContentId());
        LocalDateTime now = LocalDateTime.now();

        ContentReportDO duplicate = contentReportMapper.selectPendingByReporterAndTarget(
                reporterUserId, contentType, reqVO.getContentId());
        if (duplicate != null) {
            throw new BizException(ResponseCodeEnum.REPORT_DUPLICATE);
        }
        Long dailyCount = contentReportMapper.countByReporterSince(reporterUserId, now.minusDays(1));
        if (dailyCount != null && dailyCount >= MAX_REPORTS_PER_DAY) {
            throw new BizException(ResponseCodeEnum.REPORT_SUBMIT_TOO_FREQUENT);
        }

        ContentReportDO report = ContentReportDO.builder()
                .reporterUserId(reporterUserId)
                .spaceId(spaceId)
                .contentType(contentType)
                .contentId(reqVO.getContentId())
                .reason(reason)
                .status(0)
                .createTime(now)
                .updateTime(now)
                .build();
        contentReportMapper.insertReport(report);
        return Response.success(report.getId());
    }

    /**
     * 校验目标确实公开，并返回被举报内容所属空间。
     */
    private Long resolveReportableSpaceId(String contentType, Long contentId) {
        if (ContentGovernanceConstants.TYPE_SPACE.equals(contentType)) {
            CoupleSpaceDO space = coupleSpaceMapper.selectPublicById(contentId);
            if (space == null) {
                throw new BizException(ResponseCodeEnum.REPORT_TARGET_NOT_PUBLIC);
            }
            return space.getId();
        }

        Long spaceId;
        Integer visibility;
        Boolean deleted;
        if (ContentGovernanceConstants.TYPE_STORY.equals(contentType)) {
            StoryNodeDO story = storyNodeMapper.selectById(contentId);
            if (story == null) {
                throw new BizException(ResponseCodeEnum.REPORT_TARGET_NOT_PUBLIC);
            }
            spaceId = story.getSpaceId();
            visibility = story.getVisibility();
            deleted = story.getIsDeleted();
        } else if (ContentGovernanceConstants.TYPE_PHOTO.equals(contentType)) {
            PhotoDO photo = photoMapper.selectById(contentId);
            if (photo == null) {
                throw new BizException(ResponseCodeEnum.REPORT_TARGET_NOT_PUBLIC);
            }
            spaceId = photo.getSpaceId();
            visibility = photo.getVisibility();
            deleted = photo.getIsDeleted();
        } else if (ContentGovernanceConstants.TYPE_ANNIVERSARY.equals(contentType)) {
            AnniversaryDO anniversary = anniversaryMapper.selectById(contentId);
            if (anniversary == null) {
                throw new BizException(ResponseCodeEnum.REPORT_TARGET_NOT_PUBLIC);
            }
            spaceId = anniversary.getSpaceId();
            visibility = anniversary.getVisibility();
            deleted = anniversary.getIsDeleted();
        } else {
            throw new BizException(ResponseCodeEnum.REPORT_TARGET_NOT_PUBLIC);
        }

        if (Boolean.TRUE.equals(deleted)
                || !Integer.valueOf(ContentGovernanceConstants.VISIBILITY_PUBLIC).equals(visibility)
                || spaceId == null) {
            throw new BizException(ResponseCodeEnum.REPORT_TARGET_NOT_PUBLIC);
        }
        if (coupleSpaceMapper.selectPublicById(spaceId) == null) {
            throw new BizException(ResponseCodeEnum.REPORT_TARGET_NOT_PUBLIC);
        }
        return spaceId;
    }
}
