package com.chengliuxiang.amour.admin.service.impl;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.chengliuxiang.amour.admin.model.vo.report.AdminReportDetailReqVO;
import com.chengliuxiang.amour.admin.model.vo.report.AdminReportDetailRspVO;
import com.chengliuxiang.amour.admin.model.vo.report.AdminReportPageReqVO;
import com.chengliuxiang.amour.admin.model.vo.report.AdminReportPageRspVO;
import com.chengliuxiang.amour.admin.model.vo.report.AdminReportProcessReqVO;
import com.chengliuxiang.amour.admin.security.AdminAuthorizationService;
import com.chengliuxiang.amour.admin.service.AdminAuditService;
import com.chengliuxiang.amour.admin.service.AdminReportService;
import com.chengliuxiang.amour.common.constant.AdminAuditConstants;
import com.chengliuxiang.amour.common.constant.AdminPermissionConstants;
import com.chengliuxiang.amour.common.constant.ContentGovernanceConstants;
import com.chengliuxiang.amour.common.domain.dos.AdminAuditLogDO;
import com.chengliuxiang.amour.common.domain.dos.AnniversaryDO;
import com.chengliuxiang.amour.common.domain.dos.ContentReportDO;
import com.chengliuxiang.amour.common.domain.dos.ContentReportHandleDO;
import com.chengliuxiang.amour.common.domain.dos.CoupleSpaceDO;
import com.chengliuxiang.amour.common.domain.dos.PhotoDO;
import com.chengliuxiang.amour.common.domain.dos.StoryNodeDO;
import com.chengliuxiang.amour.common.domain.dos.UserDO;
import com.chengliuxiang.amour.common.domain.mapper.AnniversaryMapper;
import com.chengliuxiang.amour.common.domain.mapper.ContentReportHandleMapper;
import com.chengliuxiang.amour.common.domain.mapper.ContentReportMapper;
import com.chengliuxiang.amour.common.domain.mapper.CoupleSpaceMapper;
import com.chengliuxiang.amour.common.domain.mapper.PhotoMapper;
import com.chengliuxiang.amour.common.domain.mapper.StoryNodeMapper;
import com.chengliuxiang.amour.common.domain.mapper.UserMapper;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import javax.annotation.PostConstruct;
import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Slf4j
public class AdminReportServiceImpl implements AdminReportService {

    private static final long DEFAULT_PAGE_SIZE = 10L;
    private static final long MAX_PAGE_SIZE = 100L;
    private static final int REPORT_STATUS_PENDING = 0;
    private static final int REPORT_STATUS_PROCESSED = 1;
    private static final int REPORT_STATUS_REJECTED = 2;
    private static final String ACTION_REJECT = "reject";
    private static final String ACTION_CONFIRM = "confirm";
    private static final int VISIBILITY_HIDDEN = ContentGovernanceConstants.VISIBILITY_HIDDEN;
    private static final int SPACE_VISIBILITY_PRIVATE = 0;
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Resource
    private ContentReportMapper contentReportMapper;
    @Resource
    private ContentReportHandleMapper contentReportHandleMapper;
    @Resource
    private CoupleSpaceMapper coupleSpaceMapper;
    @Resource
    private StoryNodeMapper storyNodeMapper;
    @Resource
    private PhotoMapper photoMapper;
    @Resource
    private AnniversaryMapper anniversaryMapper;
    @Resource
    private UserMapper userMapper;
    @Resource
    private AdminAuthorizationService adminAuthorizationService;
    @Resource
    private AdminAuditService adminAuditService;
    @Resource
    private PlatformTransactionManager transactionManager;

    private TransactionTemplate transactionTemplate;

    @PostConstruct
    public void init() {
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    @Override
    public Response<PageResult<AdminReportPageRspVO>> findPage(AdminReportPageReqVO reqVO) {
        adminAuthorizationService.requirePermission(AdminPermissionConstants.REPORT_QUERY);
        AdminReportPageReqVO query = reqVO == null ? new AdminReportPageReqVO() : reqVO;
        long current = query.getCurrent() == null || query.getCurrent() < 1 ? 1 : query.getCurrent();
        long size = query.getSize() == null || query.getSize() < 1
                ? DEFAULT_PAGE_SIZE : Math.min(query.getSize(), MAX_PAGE_SIZE);
        if (query.getContentType() != null
                && !ContentGovernanceConstants.isSupportedReportType(query.getContentType())) {
            throw new BizException(ResponseCodeEnum.CONTENT_TYPE_NOT_SUPPORTED);
        }
        if (query.getStatus() != null
                && (query.getStatus() < REPORT_STATUS_PENDING || query.getStatus() > REPORT_STATUS_REJECTED)) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }

        IPage<ContentReportDO> page = contentReportMapper.selectAdminPage(
                current, size, query.getStatus(), StrUtil.trimToNull(query.getContentType()),
                query.getSpaceId(), query.getStartTime(), query.getEndTime());

        List<ContentReportDO> reports = page.getRecords();
        Map<Long, UserDO> userMap = loadReportUsers(reports);
        Map<Long, CoupleSpaceDO> spaceMap = loadSpaces(reports);
        Map<String, TargetSnapshot> targetMap = loadTargets(reports, spaceMap);
        Map<Long, ContentReportHandleDO> handleMap = loadHandles(reports);

        List<AdminReportPageRspVO> records = reports.stream()
                .map(report -> toPageVO(report, spaceMap, userMap, targetMap, handleMap.get(report.getId())))
                .collect(Collectors.toList());
        return Response.success(PageResult.<AdminReportPageRspVO>builder()
                .current(page.getCurrent())
                .size(page.getSize())
                .total(page.getTotal())
                .records(records)
                .build());
    }

    @Override
    public Response<AdminReportDetailRspVO> findDetail(AdminReportDetailReqVO reqVO) {
        adminAuthorizationService.requirePermission(AdminPermissionConstants.REPORT_QUERY);
        ContentReportDO report = contentReportMapper.selectById(reqVO.getReportId());
        if (report == null) {
            throw new BizException(ResponseCodeEnum.REPORT_NOT_EXIST);
        }
        Map<Long, UserDO> userMap = loadReportUsers(Collections.singletonList(report));
        Map<Long, CoupleSpaceDO> spaceMap = loadSpaces(Collections.singletonList(report));
        TargetSnapshot target = loadTarget(report, spaceMap.get(report.getSpaceId()));
        ContentReportHandleDO handle = contentReportHandleMapper.selectByReportId(report.getId());

        Response<AdminReportDetailRspVO> response = Response.success(AdminReportDetailRspVO.builder()
                .reportId(report.getId())
                .contentType(report.getContentType())
                .contentTypeText(ContentGovernanceConstants.contentTypeText(report.getContentType()))
                .contentId(report.getContentId())
                .spaceId(report.getSpaceId())
                .spaceCode(spaceCode(spaceMap.get(report.getSpaceId())))
                .spaceName(spaceName(spaceMap.get(report.getSpaceId())))
                .spaceDescription(spaceMap.get(report.getSpaceId()) == null
                        ? "" : spaceMap.get(report.getSpaceId()).getDescription())
                .spaceStatus(spaceMap.get(report.getSpaceId()) == null
                        ? null : spaceMap.get(report.getSpaceId()).getStatus())
                .spaceStatusText(spaceStatusText(spaceMap.get(report.getSpaceId()) == null
                        ? null : spaceMap.get(report.getSpaceId()).getStatus()))
                .spaceVisibility(spaceMap.get(report.getSpaceId()) == null
                        ? null : spaceMap.get(report.getSpaceId()).getVisibility())
                .spaceVisibilityText(spaceVisibilityText(spaceMap.get(report.getSpaceId()) == null
                        ? null : spaceMap.get(report.getSpaceId()).getVisibility()))
                .targetTitle(target.title)
                .targetContent(target.content)
                .targetDescription(target.description)
                .targetUrl(target.url)
                .targetHappenedTime(target.happenedTime)
                .targetLocation(target.location)
                .targetAuthorAmourId(authorAmourId(userMap, target.authorId))
                .targetAuthorName(authorName(userMap, target.authorId))
                .targetVisibility(target.visibility)
                .targetVisibilityText(ContentGovernanceConstants.visibilityText(target.visibility))
                .targetDeleted(target.deleted)
                .reporterAmourId(amourId(userMap.get(report.getReporterUserId())))
                .reporterName(displayName(userMap.get(report.getReporterUserId())))
                .reason(report.getReason())
                .status(report.getStatus())
                .statusText(reportStatusText(report.getStatus()))
                .processedByAmourId(amourId(userMap.get(report.getProcessedBy())))
                .processedByName(displayName(userMap.get(report.getProcessedBy())))
                .processedAt(format(report.getProcessedAt()))
                .createTime(format(report.getCreateTime()))
                .handleAction(handle == null ? null : handle.getAction())
                .handleNote(handle == null ? null : handle.getNote())
                .handleAt(handle == null ? null : format(handle.getCreateTime()))
                .build());

        try {
            adminAuditService.record(AdminAuditLogDO.builder()
                    .adminUserId(StpUtil.getLoginIdAsLong())
                    .action(AdminAuditConstants.ACTION_REPORT_VIEW)
                    .targetType(AdminAuditConstants.TARGET_REPORT)
                    .targetSpaceId(report.getSpaceId())
                    .targetContentType(report.getContentType())
                    .targetContentId(report.getContentId())
                    .targetReportId(report.getId())
                    .reason("后台查看举报详情")
                    .result(AdminAuditConstants.RESULT_SUCCESS)
                    .detail("status=" + report.getStatus())
                    .createTime(LocalDateTime.now())
                    .build());
        } catch (Exception exception) {
            log.warn("举报详情访问审计记录失败，reportId: {}", report.getId(), exception);
        }
        return response;
    }

    @Override
    public Response<Void> process(AdminReportProcessReqVO reqVO) {
        adminAuthorizationService.requirePermission(AdminPermissionConstants.REPORT_PROCESS);
        String action = StrUtil.trim(reqVO.getAction()).toLowerCase();
        if (!ACTION_REJECT.equals(action) && !ACTION_CONFIRM.equals(action)) {
            throw new BizException(ResponseCodeEnum.REPORT_ACTION_NOT_SUPPORTED);
        }
        String note = StrUtil.trim(reqVO.getNote());
        if (StrUtil.isBlank(note)) {
            throw new BizException(ResponseCodeEnum.REASON_REQUIRED);
        }
        note = StrUtil.maxLength(note, 1000);
        Long adminUserId = StpUtil.getLoginIdAsLong();
        final String finalNote = note;
        try {
            return transactionTemplate.execute(status -> {
                doProcess(reqVO.getReportId(), action, finalNote, reqVO.getHideContent(),
                        reqVO.getSetSpacePrivate(), adminUserId);
                return Response.success();
            });
        } catch (RuntimeException exception) {
            recordFailure(reqVO.getReportId(), adminUserId, finalNote, exception);
            throw exception;
        }
    }

    private void doProcess(Long reportId, String action, String note, Boolean hideContent,
                           Boolean setSpacePrivate, Long adminUserId) {
        ContentReportDO report = contentReportMapper.selectById(reportId);
        if (report == null) {
            throw new BizException(ResponseCodeEnum.REPORT_NOT_EXIST);
        }
        LocalDateTime now = LocalDateTime.now();
        int targetStatus = ACTION_CONFIRM.equals(action) ? REPORT_STATUS_PROCESSED : REPORT_STATUS_REJECTED;
        int claimed = contentReportMapper.claimProcess(reportId, adminUserId, targetStatus, now);
        if (claimed == 0) {
            throw new BizException(ResponseCodeEnum.REPORT_ALREADY_PROCESSED);
        }

        contentReportHandleMapper.insertHandle(ContentReportHandleDO.builder()
                .reportId(reportId)
                .adminUserId(adminUserId)
                .action(action)
                .note(note)
                .createTime(now)
                .build());

        String detail = "status " + REPORT_STATUS_PENDING + " -> " + targetStatus;
        if (ACTION_CONFIRM.equals(action)) {
            boolean hide = hideContent == null || Boolean.TRUE.equals(hideContent);
            boolean spacePrivate = Boolean.TRUE.equals(setSpacePrivate);
            if (ContentGovernanceConstants.TYPE_SPACE.equals(report.getContentType())) {
                coupleSpaceMapper.updateVisibility(report.getSpaceId(), SPACE_VISIBILITY_PRIVATE, now);
                detail += ", space_visibility -> private";
            } else {
                if (hide) {
                    hideTarget(report, adminUserId, now);
                    detail += ", content_visibility -> 2";
                }
                if (spacePrivate) {
                    coupleSpaceMapper.updateVisibility(report.getSpaceId(), SPACE_VISIBILITY_PRIVATE, now);
                    detail += ", space_visibility -> private";
                }
            }
        }

        adminAuditService.record(AdminAuditLogDO.builder()
                .adminUserId(adminUserId)
                .action(AdminAuditConstants.ACTION_REPORT_PROCESS)
                .targetType(AdminAuditConstants.TARGET_REPORT)
                .targetSpaceId(report.getSpaceId())
                .targetContentType(report.getContentType())
                .targetContentId(report.getContentId())
                .targetReportId(reportId)
                .reason(note)
                .result(AdminAuditConstants.RESULT_SUCCESS)
                .detail(detail)
                .createTime(now)
                .build());
    }

    private void hideTarget(ContentReportDO report, Long adminUserId, LocalDateTime now) {
        if (ContentGovernanceConstants.TYPE_STORY.equals(report.getContentType())) {
            storyNodeMapper.moderateVisibility(
                    report.getSpaceId(), report.getContentId(), VISIBILITY_HIDDEN, adminUserId, now);
        } else if (ContentGovernanceConstants.TYPE_PHOTO.equals(report.getContentType())) {
            photoMapper.moderateVisibility(
                    report.getSpaceId(), report.getContentId(), VISIBILITY_HIDDEN, adminUserId, now);
        } else if (ContentGovernanceConstants.TYPE_ANNIVERSARY.equals(report.getContentType())) {
            anniversaryMapper.moderateVisibility(
                    report.getSpaceId(), report.getContentId(), VISIBILITY_HIDDEN, adminUserId, now);
        }
    }

    private void recordFailure(Long reportId, Long adminUserId, String note, RuntimeException exception) {
        Long spaceId = null;
        String contentType = null;
        Long contentId = null;
        try {
            ContentReportDO report = contentReportMapper.selectById(reportId);
            if (report != null) {
                spaceId = report.getSpaceId();
                contentType = report.getContentType();
                contentId = report.getContentId();
            }
        } catch (Exception ignored) {
            // 审计补全失败不应掩盖原始异常。
        }
        try {
            adminAuditService.recordFailure(AdminAuditLogDO.builder()
                    .adminUserId(adminUserId)
                    .action(AdminAuditConstants.ACTION_REPORT_PROCESS)
                    .targetType(AdminAuditConstants.TARGET_REPORT)
                    .targetSpaceId(spaceId)
                    .targetContentType(contentType)
                    .targetContentId(contentId)
                    .targetReportId(reportId)
                    .reason(note)
                    .result(AdminAuditConstants.RESULT_FAILURE)
                    .detail(exception instanceof BizException
                            ? ((BizException) exception).getErrorCode() : "SYSTEM_ERROR")
                    .createTime(LocalDateTime.now())
                    .build());
        } catch (Exception auditException) {
            log.error("举报处理失败审计记录失败，reportId: {}", reportId, auditException);
        }
    }

    private AdminReportPageRspVO toPageVO(ContentReportDO report, Map<Long, CoupleSpaceDO> spaceMap,
                                           Map<Long, UserDO> userMap,
                                           Map<String, TargetSnapshot> targetMap,
                                           ContentReportHandleDO handle) {
        CoupleSpaceDO space = spaceMap.get(report.getSpaceId());
        TargetSnapshot target = targetMap.get(targetKey(report.getContentType(), report.getContentId()));
        if (target == null) {
            target = TargetSnapshot.missing();
        }
        return AdminReportPageRspVO.builder()
                .reportId(report.getId())
                .contentType(report.getContentType())
                .contentTypeText(ContentGovernanceConstants.contentTypeText(report.getContentType()))
                .contentId(report.getContentId())
                .spaceId(report.getSpaceId())
                .spaceCode(spaceCode(space))
                .spaceName(spaceName(space))
                .spaceStatus(space == null ? null : space.getStatus())
                .spaceVisibility(space == null ? null : space.getVisibility())
                .targetTitle(target.title)
                .targetVisibility(target.visibility)
                .targetVisibilityText(ContentGovernanceConstants.visibilityText(target.visibility))
                .targetDeleted(target.deleted)
                .reporterAmourId(amourId(userMap.get(report.getReporterUserId())))
                .reporterName(displayName(userMap.get(report.getReporterUserId())))
                .reason(report.getReason())
                .status(report.getStatus())
                .statusText(reportStatusText(report.getStatus()))
                .processedByAmourId(amourId(userMap.get(report.getProcessedBy())))
                .processedByName(displayName(userMap.get(report.getProcessedBy())))
                .processedAt(format(report.getProcessedAt()))
                .createTime(format(report.getCreateTime()))
                .handleAction(handle == null ? null : handle.getAction())
                .handleNote(handle == null ? null : handle.getNote())
                .handleAt(handle == null ? null : format(handle.getCreateTime()))
                .build();
    }

    private Map<Long, UserDO> loadReportUsers(List<ContentReportDO> reports) {
        Set<Long> userIds = new HashSet<>();
        for (ContentReportDO report : reports) {
            addUserId(userIds, report.getReporterUserId());
            addUserId(userIds, report.getProcessedBy());
        }
        return loadUsers(userIds);
    }

    private Map<Long, CoupleSpaceDO> loadSpaces(List<ContentReportDO> reports) {
        Set<Long> spaceIds = reports.stream().map(ContentReportDO::getSpaceId)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        if (spaceIds.isEmpty()) {
            return Collections.emptyMap();
        }
        return coupleSpaceMapper.selectBatchIds(spaceIds).stream()
                .collect(Collectors.toMap(CoupleSpaceDO::getId, Function.identity(), (left, right) -> left));
    }

    private Map<String, TargetSnapshot> loadTargets(List<ContentReportDO> reports,
                                                    Map<Long, CoupleSpaceDO> spaceMap) {
        Map<String, TargetSnapshot> targets = new HashMap<>();
        Set<Long> storyIds = idsByType(reports, ContentGovernanceConstants.TYPE_STORY);
        Set<Long> photoIds = idsByType(reports, ContentGovernanceConstants.TYPE_PHOTO);
        Set<Long> anniversaryIds = idsByType(reports, ContentGovernanceConstants.TYPE_ANNIVERSARY);

        if (!storyIds.isEmpty()) {
            storyNodeMapper.selectBatchIds(storyIds)
                    .forEach(story -> targets.put(targetKey(ContentGovernanceConstants.TYPE_STORY, story.getId()),
                            storySnapshot(story)));
        }
        if (!photoIds.isEmpty()) {
            photoMapper.selectBatchIds(photoIds)
                    .forEach(photo -> targets.put(targetKey(ContentGovernanceConstants.TYPE_PHOTO, photo.getId()),
                            photoSnapshot(photo)));
        }
        if (!anniversaryIds.isEmpty()) {
            anniversaryMapper.selectBatchIds(anniversaryIds)
                    .forEach(anniversary -> targets.put(
                            targetKey(ContentGovernanceConstants.TYPE_ANNIVERSARY, anniversary.getId()),
                            anniversarySnapshot(anniversary)));
        }
        for (ContentReportDO report : reports) {
            if (!ContentGovernanceConstants.TYPE_SPACE.equals(report.getContentType())) {
                continue;
            }
            CoupleSpaceDO space = spaceMap.get(report.getContentId());
            targets.put(targetKey(ContentGovernanceConstants.TYPE_SPACE, report.getContentId()),
                    spaceSnapshot(space));
        }
        return targets;
    }

    private TargetSnapshot loadTarget(ContentReportDO report, CoupleSpaceDO space) {
        if (ContentGovernanceConstants.TYPE_SPACE.equals(report.getContentType())) {
            return spaceSnapshot(space);
        }
        if (ContentGovernanceConstants.TYPE_STORY.equals(report.getContentType())) {
            StoryNodeDO story = storyNodeMapper.selectById(report.getContentId());
            return story == null ? TargetSnapshot.missing() : storySnapshot(story);
        }
        if (ContentGovernanceConstants.TYPE_PHOTO.equals(report.getContentType())) {
            PhotoDO photo = photoMapper.selectById(report.getContentId());
            return photo == null ? TargetSnapshot.missing() : photoSnapshot(photo);
        }
        if (ContentGovernanceConstants.TYPE_ANNIVERSARY.equals(report.getContentType())) {
            AnniversaryDO anniversary = anniversaryMapper.selectById(report.getContentId());
            return anniversary == null ? TargetSnapshot.missing() : anniversarySnapshot(anniversary);
        }
        return TargetSnapshot.missing();
    }

    private Set<Long> idsByType(List<ContentReportDO> reports, String contentType) {
        return reports.stream()
                .filter(report -> Objects.equals(report.getContentType(), contentType))
                .map(ContentReportDO::getContentId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    private TargetSnapshot storySnapshot(StoryNodeDO story) {
        TargetSnapshot target = new TargetSnapshot();
        target.contentType = ContentGovernanceConstants.TYPE_STORY;
        target.contentId = story.getId();
        target.spaceId = story.getSpaceId();
        target.title = story.getTitle();
        target.content = story.getContent();
        target.description = story.getSummary();
        target.url = story.getCoverImage();
        target.happenedTime = format(story.getHappenedTime());
        target.location = story.getLocation();
        target.authorId = story.getCreatedBy();
        target.visibility = story.getVisibility();
        target.deleted = story.getIsDeleted();
        return target;
    }

    private TargetSnapshot photoSnapshot(PhotoDO photo) {
        TargetSnapshot target = new TargetSnapshot();
        target.contentType = ContentGovernanceConstants.TYPE_PHOTO;
        target.contentId = photo.getId();
        target.spaceId = photo.getSpaceId();
        target.title = photo.getTitle();
        target.content = photo.getDescription();
        target.description = photo.getDescription();
        target.url = photo.getUrl();
        target.happenedTime = format(photo.getTakenTime());
        target.location = photo.getLocation();
        target.authorId = photo.getCreatedBy();
        target.visibility = photo.getVisibility();
        target.deleted = photo.getIsDeleted();
        return target;
    }

    private TargetSnapshot anniversarySnapshot(AnniversaryDO anniversary) {
        TargetSnapshot target = new TargetSnapshot();
        target.contentType = ContentGovernanceConstants.TYPE_ANNIVERSARY;
        target.contentId = anniversary.getId();
        target.spaceId = anniversary.getSpaceId();
        target.title = anniversary.getTitle();
        target.content = anniversary.getDescription();
        target.description = anniversary.getDescription();
        target.happenedTime = anniversary.getAnniversaryDate() == null
                ? "" : anniversary.getAnniversaryDate().toString();
        target.location = anniversary.getLocation();
        target.authorId = anniversary.getCreatedBy();
        target.visibility = anniversary.getVisibility();
        target.deleted = anniversary.getIsDeleted();
        return target;
    }

    private TargetSnapshot spaceSnapshot(CoupleSpaceDO space) {
        if (space == null) {
            return TargetSnapshot.missing();
        }
        TargetSnapshot target = new TargetSnapshot();
        target.contentType = ContentGovernanceConstants.TYPE_SPACE;
        target.contentId = space.getId();
        target.spaceId = space.getId();
        target.title = space.getSpaceName();
        target.content = space.getDescription();
        target.description = space.getDescription();
        target.happenedTime = format(space.getPublicAt());
        target.authorId = space.getCreatedBy();
        target.visibility = space.getVisibility();
        target.deleted = Objects.equals(space.getStatus(), 5);
        return target;
    }

    private Map<Long, ContentReportHandleDO> loadHandles(List<ContentReportDO> reports) {
        if (CollUtil.isEmpty(reports)) {
            return Collections.emptyMap();
        }
        List<ContentReportHandleDO> handles = contentReportHandleMapper.selectByReportIds(
                reports.stream().map(ContentReportDO::getId).collect(Collectors.toList()));
        return handles.stream().collect(Collectors.toMap(
                ContentReportHandleDO::getReportId, Function.identity(), (left, right) -> left));
    }

    private Map<Long, UserDO> loadUsers(Collection<Long> userIds) {
        Set<Long> ids = userIds.stream().filter(Objects::nonNull).collect(Collectors.toSet());
        if (ids.isEmpty()) {
            return Collections.emptyMap();
        }
        return userMapper.findUsersByIds(ids).stream()
                .collect(Collectors.toMap(UserDO::getId, Function.identity(), (left, right) -> left));
    }

    private void addUserId(Set<Long> userIds, Long userId) {
        if (userId != null) {
            userIds.add(userId);
        }
    }

    private String targetKey(String contentType, Long contentId) {
        return contentType + ":" + contentId;
    }

    private String amourId(UserDO user) {
        return user == null ? "" : StrUtil.blankToDefault(user.getAmourId(), "");
    }

    private String displayName(UserDO user) {
        return user == null ? "" : StrUtil.blankToDefault(user.getDisplayName(), "用户");
    }

    private String authorAmourId(Map<Long, UserDO> userMap, Long authorId) {
        return amourId(authorId == null ? null : userMap.get(authorId));
    }

    private String authorName(Map<Long, UserDO> userMap, Long authorId) {
        return displayName(authorId == null ? null : userMap.get(authorId));
    }

    private String spaceCode(CoupleSpaceDO space) {
        return space == null ? "" : StrUtil.blankToDefault(space.getSpaceCode(), "");
    }

    private String spaceName(CoupleSpaceDO space) {
        return space == null ? "未知空间" : StrUtil.blankToDefault(space.getSpaceName(), "未知空间");
    }

    private String format(LocalDateTime time) {
        return time == null ? "" : FORMATTER.format(time);
    }

    private String reportStatusText(Integer status) {
        if (status == null) {
            return "";
        }
        switch (status) {
            case REPORT_STATUS_PENDING:
                return "待处理";
            case REPORT_STATUS_PROCESSED:
                return "已处理";
            case REPORT_STATUS_REJECTED:
                return "已驳回";
            default:
                return "未知状态";
        }
    }

    private String spaceStatusText(Integer status) {
        if (status == null) {
            return "";
        }
        switch (status) {
            case 0:
                return "等待绑定";
            case 1:
                return "正常";
            case 2:
                return "已冻结";
            case 3:
                return "已归档";
            case 4:
                return "删除等待期";
            case 5:
                return "已解绑";
            default:
                return "未知状态";
        }
    }

    private String spaceVisibilityText(Integer visibility) {
        return Objects.equals(visibility, 1) ? "公开" : "私密";
    }

    private static final class TargetSnapshot {
        private String contentType;
        private Long contentId;
        private Long spaceId;
        private String title;
        private String content;
        private String description;
        private String url;
        private String happenedTime;
        private String location;
        private Long authorId;
        private Integer visibility;
        private Boolean deleted;

        private static TargetSnapshot missing() {
            TargetSnapshot snapshot = new TargetSnapshot();
            snapshot.title = "目标内容不存在或已删除";
            snapshot.deleted = true;
            return snapshot;
        }
    }
}
