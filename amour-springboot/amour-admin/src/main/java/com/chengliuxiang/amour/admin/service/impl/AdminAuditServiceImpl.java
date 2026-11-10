package com.chengliuxiang.amour.admin.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.chengliuxiang.amour.admin.model.vo.audit.AdminAuditPageReqVO;
import com.chengliuxiang.amour.admin.model.vo.audit.AdminAuditPageRspVO;
import com.chengliuxiang.amour.admin.service.AdminAuditService;
import com.chengliuxiang.amour.common.constant.AdminAuditConstants;
import com.chengliuxiang.amour.common.domain.dos.AdminAuditLogDO;
import com.chengliuxiang.amour.common.domain.dos.UserDO;
import com.chengliuxiang.amour.common.domain.mapper.AdminAuditLogMapper;
import com.chengliuxiang.amour.common.domain.mapper.UserMapper;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class AdminAuditServiceImpl implements AdminAuditService {

    private static final int MAX_REASON_LENGTH = 1000;
    private static final int MAX_DETAIL_LENGTH = 1000;
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Resource
    private AdminAuditLogMapper adminAuditLogMapper;
    @Resource
    private UserMapper userMapper;

    @Override
    public void record(AdminAuditLogDO auditLog) {
        insertSafely(auditLog);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW, rollbackFor = Exception.class)
    public void recordFailure(AdminAuditLogDO auditLog) {
        insertSafely(auditLog);
    }

    private void insertSafely(AdminAuditLogDO auditLog) {
        if (auditLog == null) {
            return;
        }
        auditLog.setReason(StrUtil.maxLength(StrUtil.nullToEmpty(auditLog.getReason()), MAX_REASON_LENGTH));
        auditLog.setDetail(StrUtil.maxLength(StrUtil.nullToEmpty(auditLog.getDetail()), MAX_DETAIL_LENGTH));
        if (auditLog.getResult() == null) {
            auditLog.setResult(AdminAuditConstants.RESULT_SUCCESS);
        }
        if (auditLog.getCreateTime() == null) {
            auditLog.setCreateTime(LocalDateTime.now());
        }
        adminAuditLogMapper.insertAuditLog(auditLog);
    }

    @Override
    public Response<PageResult<AdminAuditPageRspVO>> findPage(AdminAuditPageReqVO reqVO) {
        AdminAuditPageReqVO query = reqVO == null ? new AdminAuditPageReqVO() : reqVO;
        long current = query.getCurrent() == null || query.getCurrent() < 1 ? 1 : query.getCurrent();
        long size = query.getSize() == null || query.getSize() < 1 ? 10 : Math.min(query.getSize(), 100);

        IPage<AdminAuditLogDO> page = adminAuditLogMapper.selectAdminPage(
                current, size, StrUtil.trimToNull(query.getAction()), StrUtil.trimToNull(query.getTargetType()),
                query.getTargetSpaceId(), query.getAdminUserId(), query.getStartTime(), query.getEndTime());

        Set<Long> adminIds = page.getRecords().stream()
                .map(AdminAuditLogDO::getAdminUserId)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());
        java.util.Map<Long, UserDO> userMap = adminIds.isEmpty()
                ? Collections.emptyMap()
                : userMapper.findUsersByIds(adminIds).stream()
                .collect(Collectors.toMap(UserDO::getId, Function.identity(), (left, right) -> left));

        List<AdminAuditPageRspVO> records = page.getRecords().stream()
                .map(item -> toVO(item, userMap.get(item.getAdminUserId())))
                .collect(Collectors.toList());
        return Response.success(PageResult.<AdminAuditPageRspVO>builder()
                .current(page.getCurrent())
                .size(page.getSize())
                .total(page.getTotal())
                .records(records)
                .build());
    }

    private AdminAuditPageRspVO toVO(AdminAuditLogDO item, UserDO admin) {
        return AdminAuditPageRspVO.builder()
                .id(item.getId())
                .adminAmourId(admin == null ? "" : StrUtil.blankToDefault(admin.getAmourId(), ""))
                .adminDisplayName(admin == null ? "管理员" : StrUtil.blankToDefault(admin.getDisplayName(), "管理员"))
                .action(item.getAction())
                .actionText(actionText(item.getAction()))
                .targetType(item.getTargetType())
                .targetTypeText(targetTypeText(item.getTargetType()))
                .targetSpaceId(item.getTargetSpaceId())
                .targetContentType(item.getTargetContentType())
                .targetContentId(item.getTargetContentId())
                .targetUserId(item.getTargetUserId())
                .targetReportId(item.getTargetReportId())
                .reason(item.getReason())
                .result(item.getResult())
                .detail(item.getDetail())
                .createTime(item.getCreateTime() == null ? "" : FORMATTER.format(item.getCreateTime()))
                .build();
    }

    private String actionText(String action) {
        if (action == null) {
            return "";
        }
        switch (action) {
            case AdminAuditConstants.ACTION_SPACE_VIEW:
                return "查看空间列表";
            case AdminAuditConstants.ACTION_SPACE_DETAIL_VIEW:
                return "查看空间详情";
            case AdminAuditConstants.ACTION_SPACE_RESTORE:
                return "人工恢复空间";
            case AdminAuditConstants.ACTION_SPACE_SET_PRIVATE:
                return "设为私密";
            case AdminAuditConstants.ACTION_CONTENT_VIEW:
                return "查看私密内容";
            case AdminAuditConstants.ACTION_CONTENT_VISIBILITY:
                return "调整内容可见性";
            case AdminAuditConstants.ACTION_CONTENT_DELETE:
                return "逻辑删除内容";
            case AdminAuditConstants.ACTION_REPORT_PROCESS:
                return "处理举报";
            case AdminAuditConstants.ACTION_REPORT_VIEW:
                return "查看举报详情";
            case AdminAuditConstants.ACTION_USER_DISABLE:
                return "停用用户";
            case AdminAuditConstants.ACTION_USER_UPDATE:
                return "更新用户";
            default:
                return action;
        }
    }

    private String targetTypeText(String targetType) {
        if (targetType == null) {
            return "";
        }
        switch (targetType) {
            case AdminAuditConstants.TARGET_SPACE:
                return "情侣空间";
            case AdminAuditConstants.TARGET_CONTENT:
                return "内容";
            case AdminAuditConstants.TARGET_USER:
                return "用户";
            case AdminAuditConstants.TARGET_REPORT:
                return "举报";
            case AdminAuditConstants.TARGET_DICT:
                return "字典/配置";
            case AdminAuditConstants.TARGET_ADMIN:
                return "后台权限";
            default:
                return targetType;
        }
    }
}
