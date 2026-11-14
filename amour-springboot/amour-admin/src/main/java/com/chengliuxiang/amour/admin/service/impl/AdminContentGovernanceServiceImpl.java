package com.chengliuxiang.amour.admin.service.impl;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.chengliuxiang.amour.admin.model.vo.content.AdminContentDeleteReqVO;
import com.chengliuxiang.amour.admin.model.vo.content.AdminContentDetailReqVO;
import com.chengliuxiang.amour.admin.model.vo.content.AdminContentDetailRspVO;
import com.chengliuxiang.amour.admin.model.vo.content.AdminContentModerateReqVO;
import com.chengliuxiang.amour.admin.model.vo.content.AdminContentPageReqVO;
import com.chengliuxiang.amour.admin.model.vo.content.AdminContentPageRspVO;
import com.chengliuxiang.amour.admin.security.AdminAuthorizationService;
import com.chengliuxiang.amour.admin.service.AdminAuditService;
import com.chengliuxiang.amour.admin.service.AdminContentGovernanceService;
import com.chengliuxiang.amour.common.constant.AdminAuditConstants;
import com.chengliuxiang.amour.common.constant.AdminPermissionConstants;
import com.chengliuxiang.amour.common.constant.ContentGovernanceConstants;
import com.chengliuxiang.amour.common.domain.dos.AdminAuditLogDO;
import com.chengliuxiang.amour.common.domain.dos.AnniversaryDO;
import com.chengliuxiang.amour.common.domain.dos.CoupleSpaceDO;
import com.chengliuxiang.amour.common.domain.dos.MessageDO;
import com.chengliuxiang.amour.common.domain.dos.MessageReplyDO;
import com.chengliuxiang.amour.common.domain.dos.PhotoCategoryDO;
import com.chengliuxiang.amour.common.domain.dos.PhotoDO;
import com.chengliuxiang.amour.common.domain.dos.StoryChapterDO;
import com.chengliuxiang.amour.common.domain.dos.StoryNodeDO;
import com.chengliuxiang.amour.common.domain.dos.StoryNodeImageDO;
import com.chengliuxiang.amour.common.domain.dos.UserDO;
import com.chengliuxiang.amour.common.domain.mapper.AnniversaryMapper;
import com.chengliuxiang.amour.common.domain.mapper.CoupleSpaceMapper;
import com.chengliuxiang.amour.common.domain.mapper.MessageMapper;
import com.chengliuxiang.amour.common.domain.mapper.MessageReplyMapper;
import com.chengliuxiang.amour.common.domain.mapper.PhotoCategoryMapper;
import com.chengliuxiang.amour.common.domain.mapper.PhotoMapper;
import com.chengliuxiang.amour.common.domain.mapper.StoryChapterMapper;
import com.chengliuxiang.amour.common.domain.mapper.StoryNodeImageMapper;
import com.chengliuxiang.amour.common.domain.mapper.StoryNodeMapper;
import com.chengliuxiang.amour.common.domain.mapper.UserMapper;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.model.PageResult;
import com.chengliuxiang.amour.common.utils.Response;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
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
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Slf4j
public class AdminContentGovernanceServiceImpl implements AdminContentGovernanceService {

    private static final long DEFAULT_PAGE_SIZE = 10L;
    private static final long MAX_PAGE_SIZE = 100L;
    private static final int SPACE_STATUS_NORMAL = 1;
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Resource
    private StoryNodeMapper storyNodeMapper;
    @Resource
    private StoryChapterMapper storyChapterMapper;
    @Resource
    private StoryNodeImageMapper storyNodeImageMapper;
    @Resource
    private PhotoMapper photoMapper;
    @Resource
    private PhotoCategoryMapper photoCategoryMapper;
    @Resource
    private AnniversaryMapper anniversaryMapper;
    @Resource
    private MessageMapper messageMapper;
    @Resource
    private MessageReplyMapper messageReplyMapper;
    @Resource
    private CoupleSpaceMapper coupleSpaceMapper;
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
    public Response<PageResult<AdminContentPageRspVO>> findPage(AdminContentPageReqVO reqVO) {
        adminAuthorizationService.requirePermission(AdminPermissionConstants.CONTENT_QUERY);
        AdminContentPageReqVO query = reqVO == null ? new AdminContentPageReqVO() : reqVO;
        String contentType = requireSupportedContentType(query.getContentType());
        Long spaceId = resolveListSpaceId(query.getSpaceId());

        long current = query.getCurrent() == null || query.getCurrent() < 1 ? 1 : query.getCurrent();
        long size = query.getSize() == null || query.getSize() < 1
                ? DEFAULT_PAGE_SIZE : Math.min(query.getSize(), MAX_PAGE_SIZE);
        boolean includeDeleted = Boolean.TRUE.equals(query.getIncludeDeleted());
        String keyword = StrUtil.trimToNull(query.getKeyword());
        Integer visibility = query.getVisibility();
        if (visibility != null && !ContentGovernanceConstants.isValidVisibility(visibility)) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }

        long total;
        List<AdminContentPageRspVO> records;
        if (ContentGovernanceConstants.TYPE_STORY.equals(contentType)) {
            IPage<StoryNodeDO> page = storyNodeMapper.selectAdminGovernancePage(
                    current, size, spaceId, keyword, visibility, includeDeleted);
            total = page.getTotal();
            records = buildStoryRecords(page.getRecords());
        } else if (ContentGovernanceConstants.TYPE_PHOTO.equals(contentType)) {
            IPage<PhotoDO> page = photoMapper.findAdminGovernancePage(
                    current, size, spaceId, keyword, visibility, includeDeleted);
            total = page.getTotal();
            records = buildPhotoRecords(page.getRecords());
        } else if (ContentGovernanceConstants.TYPE_ANNIVERSARY.equals(contentType)) {
            IPage<AnniversaryDO> page = anniversaryMapper.selectAdminGovernancePage(
                    current, size, spaceId, keyword, visibility, includeDeleted);
            total = page.getTotal();
            records = buildAnniversaryRecords(page.getRecords());
        } else {
            if (visibility != null && !Objects.equals(visibility, ContentGovernanceConstants.VISIBILITY_MEMBER_ONLY)) {
                return Response.success(PageResult.<AdminContentPageRspVO>builder()
                        .current(current)
                        .size(size)
                        .total(0L)
                        .records(Collections.emptyList())
                        .build());
            }
            IPage<MessageDO> page = messageMapper.selectAdminGovernancePage(
                    current, size, spaceId, keyword, includeDeleted);
            total = page.getTotal();
            records = buildMessageRecords(page.getRecords());
        }

        return Response.success(PageResult.<AdminContentPageRspVO>builder()
                .current(current)
                .size(size)
                .total(total)
                .records(records)
                .build());
    }

    @Override
    public Response<AdminContentDetailRspVO> findDetail(AdminContentDetailReqVO reqVO) {
        adminAuthorizationService.requirePermission(AdminPermissionConstants.CONTENT_QUERY);
        if (reqVO == null || reqVO.getContentId() == null) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        String contentType = requireSupportedContentType(reqVO.getContentType());
        DetailContext context = loadDetailContext(contentType, reqVO.getContentId(), reqVO.getSpaceId());
        AdminContentDetailRspVO vo = buildDetail(contentType, context);

        // 内容详情可能包含私密正文，记录一次读取审计；审计失败不阻断排障。
        try {
            adminAuditService.record(AdminAuditLogDO.builder()
                    .adminUserId(StpUtil.getLoginIdAsLong())
                    .action(AdminAuditConstants.ACTION_CONTENT_VIEW)
                    .targetType(AdminAuditConstants.TARGET_CONTENT)
                    .targetSpaceId(context.spaceId)
                    .targetContentType(contentType)
                    .targetContentId(reqVO.getContentId())
                    .reason("后台查看内容详情")
                    .result(AdminAuditConstants.RESULT_SUCCESS)
                    .detail("visibility=" + context.visibility + ", deleted=" + context.deleted)
                    .createTime(LocalDateTime.now())
                    .build());
        } catch (Exception exception) {
            log.warn("内容详情访问审计记录失败，type: {}, id: {}", contentType, reqVO.getContentId(), exception);
        }
        return Response.success(vo);
    }

    @Override
    public Response<Void> moderateVisibility(AdminContentModerateReqVO reqVO) {
        adminAuthorizationService.requirePermission(AdminPermissionConstants.CONTENT_MODERATE);
        String contentType = requireSupportedContentType(reqVO.getContentType());
        if (reqVO.getSpaceId() == null || reqVO.getContentId() == null) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        if (ContentGovernanceConstants.TYPE_MESSAGE.equals(contentType)) {
            throw new BizException(ResponseCodeEnum.CONTENT_OPERATION_NOT_SUPPORTED);
        }
        Integer visibility = reqVO.getVisibility();
        if (!ContentGovernanceConstants.isValidVisibility(visibility)) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        String reason = requireReason(reqVO.getReason());
        Long adminUserId = StpUtil.getLoginIdAsLong();
        try {
            return transactionTemplate.execute(status -> {
                doModerateVisibility(contentType, reqVO.getSpaceId(), reqVO.getContentId(),
                        visibility, reason, adminUserId);
                return Response.success();
            });
        } catch (RuntimeException exception) {
            recordFailure(AdminAuditConstants.ACTION_CONTENT_VISIBILITY, reqVO.getSpaceId(),
                    contentType, reqVO.getContentId(), adminUserId, reason, exception);
            throw exception;
        }
    }

    private void doModerateVisibility(String contentType, Long spaceId, Long contentId,
                                      Integer visibility, String reason, Long adminUserId) {
        CoupleSpaceDO space = requireSpace(spaceId);
        Integer beforeVisibility = requireContentVisibility(contentType, spaceId, contentId);
        if (visibility == ContentGovernanceConstants.VISIBILITY_PUBLIC
                && !Objects.equals(space.getStatus(), SPACE_STATUS_NORMAL)) {
            throw new BizException(ResponseCodeEnum.SPACE_CONTENT_PUBLISH_NOT_ALLOWED);
        }

        LocalDateTime now = LocalDateTime.now();
        int updated;
        if (ContentGovernanceConstants.TYPE_STORY.equals(contentType)) {
            updated = storyNodeMapper.moderateVisibility(spaceId, contentId, visibility, adminUserId, now);
        } else if (ContentGovernanceConstants.TYPE_PHOTO.equals(contentType)) {
            updated = photoMapper.moderateVisibility(spaceId, contentId, visibility, adminUserId, now);
        } else {
            updated = anniversaryMapper.moderateVisibility(spaceId, contentId, visibility, adminUserId, now);
        }
        if (updated == 0) {
            throw new BizException(ResponseCodeEnum.CONTENT_NOT_IN_SPACE);
        }

        adminAuditService.record(AdminAuditLogDO.builder()
                .adminUserId(adminUserId)
                .action(AdminAuditConstants.ACTION_CONTENT_VISIBILITY)
                .targetType(AdminAuditConstants.TARGET_CONTENT)
                .targetSpaceId(spaceId)
                .targetContentType(contentType)
                .targetContentId(contentId)
                .reason(reason)
                .result(AdminAuditConstants.RESULT_SUCCESS)
                .detail("visibility " + beforeVisibility + " -> " + visibility)
                .createTime(now)
                .build());
    }

    @Override
    public Response<Void> deleteContent(AdminContentDeleteReqVO reqVO) {
        adminAuthorizationService.requirePermission(AdminPermissionConstants.CONTENT_DELETE);
        String contentType = requireSupportedContentType(reqVO.getContentType());
        if (reqVO.getSpaceId() == null || reqVO.getContentId() == null) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        String reason = requireReason(reqVO.getReason());
        Long adminUserId = StpUtil.getLoginIdAsLong();
        try {
            return transactionTemplate.execute(status -> {
                doDeleteContent(contentType, reqVO.getSpaceId(), reqVO.getContentId(), reason, adminUserId);
                return Response.success();
            });
        } catch (RuntimeException exception) {
            recordFailure(AdminAuditConstants.ACTION_CONTENT_DELETE, reqVO.getSpaceId(),
                    contentType, reqVO.getContentId(), adminUserId, reason, exception);
            throw exception;
        }
    }

    private void doDeleteContent(String contentType, Long spaceId, Long contentId,
                                 String reason, Long adminUserId) {
        requireSpace(spaceId);
        Integer beforeVisibility = requireContentVisibility(contentType, spaceId, contentId);
        LocalDateTime now = LocalDateTime.now();
        int updated;
        if (ContentGovernanceConstants.TYPE_STORY.equals(contentType)) {
            updated = storyNodeMapper.softDelete(spaceId, contentId, adminUserId, now);
        } else if (ContentGovernanceConstants.TYPE_PHOTO.equals(contentType)) {
            updated = photoMapper.markDeletedByAdmin(spaceId, contentId, adminUserId, now);
        } else if (ContentGovernanceConstants.TYPE_ANNIVERSARY.equals(contentType)) {
            updated = anniversaryMapper.softDelete(spaceId, contentId, adminUserId, now);
        } else if (ContentGovernanceConstants.TYPE_MESSAGE.equals(contentType)) {
            updated = messageMapper.softDeleteAsAdmin(spaceId, contentId, adminUserId, now);
            if (updated > 0) {
                messageReplyMapper.softDeleteByMessageId(spaceId, contentId, now);
            }
        } else {
            throw new BizException(ResponseCodeEnum.CONTENT_TYPE_NOT_SUPPORTED);
        }
        if (updated == 0) {
            throw new BizException(ResponseCodeEnum.CONTENT_NOT_IN_SPACE);
        }

        adminAuditService.record(AdminAuditLogDO.builder()
                .adminUserId(adminUserId)
                .action(AdminAuditConstants.ACTION_CONTENT_DELETE)
                .targetType(AdminAuditConstants.TARGET_CONTENT)
                .targetSpaceId(spaceId)
                .targetContentType(contentType)
                .targetContentId(contentId)
                .reason(reason)
                .result(AdminAuditConstants.RESULT_SUCCESS)
                .detail("is_deleted false -> true, visibility=" + beforeVisibility)
                .createTime(now)
                .build());
    }

    private List<AdminContentPageRspVO> buildStoryRecords(List<StoryNodeDO> stories) {
        if (CollUtil.isEmpty(stories)) {
            return Collections.emptyList();
        }
        Map<Long, CoupleSpaceDO> spaceMap = loadSpaces(stories.stream()
                .map(StoryNodeDO::getSpaceId).collect(Collectors.toSet()));
        Map<Long, UserDO> userMap = loadUsers(stories.stream()
                .map(StoryNodeDO::getCreatedBy).collect(Collectors.toSet()));
        Map<Long, String> chapterNameMap = loadChapterNames(stories.stream()
                .map(StoryNodeDO::getChapterId).collect(Collectors.toSet()));

        return stories.stream()
                .map(story -> {
                    AdminContentPageRspVO vo = toPageVO(ContentGovernanceConstants.TYPE_STORY, story.getId(),
                            story.getSpaceId(), spaceMap.get(story.getSpaceId()), story.getTitle(),
                            story.getSummary(), story.getVisibility(), story.getIsDeleted(),
                            story.getCreatedBy(), userMap, String.valueOf(story.getChapterId()),
                            chapterNameMap.get(story.getChapterId()), null, null, null, null,
                            format(story.getHappenedTime()), format(story.getCreateTime()),
                            format(story.getUpdateTime()), null);
                    vo.setCoverImage(story.getCoverImage());
                    vo.setSortOrder(story.getSortOrder());
                    vo.setLocation(story.getLocation());
                    return vo;
                })
                .collect(Collectors.toList());
    }

    private List<AdminContentPageRspVO> buildPhotoRecords(List<PhotoDO> photos) {
        if (CollUtil.isEmpty(photos)) {
            return Collections.emptyList();
        }
        Map<Long, CoupleSpaceDO> spaceMap = loadSpaces(photos.stream()
                .map(PhotoDO::getSpaceId).collect(Collectors.toSet()));
        Map<Long, UserDO> userMap = loadUsers(photos.stream()
                .map(PhotoDO::getCreatedBy).collect(Collectors.toSet()));
        Map<Long, String> categoryNameMap = loadCategoryNames(photos.stream()
                .map(PhotoDO::getPhotoCategoryId).collect(Collectors.toSet()));

        return photos.stream()
                .map(photo -> {
                    AdminContentPageRspVO vo = toPageVO(ContentGovernanceConstants.TYPE_PHOTO, photo.getId(),
                            photo.getSpaceId(), spaceMap.get(photo.getSpaceId()), photo.getTitle(),
                            photo.getDescription(), photo.getVisibility(), photo.getIsDeleted(),
                            photo.getCreatedBy(), userMap, null, null, photo.getPhotoCategoryId(),
                            categoryNameMap.get(photo.getPhotoCategoryId()), null, null,
                            format(photo.getTakenTime()), format(photo.getCreateTime()),
                            format(photo.getUpdateTime()), null);
                    vo.setUrl(photo.getUrl());
                    vo.setIsCover(photo.getIsCover());
                    vo.setSortOrder(photo.getSortOrder());
                    vo.setLocation(photo.getLocation());
                    vo.setCoverImage(photo.getUrl());
                    return vo;
                })
                .collect(Collectors.toList());
    }

    private List<AdminContentPageRspVO> buildAnniversaryRecords(List<AnniversaryDO> anniversaries) {
        if (CollUtil.isEmpty(anniversaries)) {
            return Collections.emptyList();
        }
        Map<Long, CoupleSpaceDO> spaceMap = loadSpaces(anniversaries.stream()
                .map(AnniversaryDO::getSpaceId).collect(Collectors.toSet()));
        Map<Long, UserDO> userMap = loadUsers(anniversaries.stream()
                .map(AnniversaryDO::getCreatedBy).collect(Collectors.toSet()));

        return anniversaries.stream()
                .map(anniversary -> {
                    AdminContentPageRspVO vo = toPageVO(ContentGovernanceConstants.TYPE_ANNIVERSARY,
                            anniversary.getId(), anniversary.getSpaceId(), spaceMap.get(anniversary.getSpaceId()),
                            anniversary.getTitle(), anniversary.getDescription(), anniversary.getVisibility(),
                            anniversary.getIsDeleted(), anniversary.getCreatedBy(), userMap, null, null,
                            null, null, null, anniversary.getCategory(),
                            anniversary.getAnniversaryDate() == null ? null : anniversary.getAnniversaryDate().toString(),
                            format(anniversary.getCreateTime()), format(anniversary.getUpdateTime()),
                            null);
                    vo.setRepeatType(anniversary.getRepeatType());
                    vo.setColorCode(anniversary.getColorCode());
                    vo.setSortOrder(anniversary.getSortOrder());
                    vo.setLocation(anniversary.getLocation());
                    return vo;
                })
                .collect(Collectors.toList());
    }

    private List<AdminContentPageRspVO> buildMessageRecords(List<MessageDO> messages) {
        if (CollUtil.isEmpty(messages)) {
            return Collections.emptyList();
        }
        Map<Long, CoupleSpaceDO> spaceMap = loadSpaces(messages.stream()
                .map(MessageDO::getSpaceId).collect(Collectors.toSet()));
        Map<Long, UserDO> userMap = loadUsers(messages.stream()
                .map(MessageDO::getUserId).collect(Collectors.toSet()));
        Map<Long, Integer> replyCountMap = loadReplyCounts(messages);

        return messages.stream()
                .map(message -> toPageVO(ContentGovernanceConstants.TYPE_MESSAGE, message.getId(),
                        message.getSpaceId(), spaceMap.get(message.getSpaceId()),
                        StrUtil.maxLength(StrUtil.blankToDefault(message.getContent(), ""), 80), "",
                        ContentGovernanceConstants.VISIBILITY_MEMBER_ONLY, message.getIsDeleted(),
                        message.getUserId(), userMap, null, null, null, null, null, null,
                        format(message.getCreateTime()), format(message.getCreateTime()),
                        format(message.getUpdateTime()), replyCountMap.getOrDefault(message.getId(), 0)))
                .collect(Collectors.toList());
    }

    private AdminContentPageRspVO toPageVO(String contentType, Long contentId, Long spaceId,
                                           CoupleSpaceDO space, String title, String summary,
                                           Integer visibility, Boolean deleted, Long authorId,
                                           Map<Long, UserDO> userMap, String chapterId, String chapterName,
                                           Long photoCategoryId, String categoryName,
                                           Long ignored, String category, String happenedTime,
                                           String createTime, String updateTime,
                                           Integer replyCount) {
        UserDO author = authorId == null ? null : userMap.get(authorId);
        String categoryText = categoryName;
        if (StringUtils.isBlank(categoryText) && StringUtils.isNotBlank(category)) {
            categoryText = category;
        }
        return AdminContentPageRspVO.builder()
                .contentType(contentType)
                .contentTypeText(ContentGovernanceConstants.contentTypeText(contentType))
                .contentId(contentId)
                .spaceId(spaceId)
                .spaceCode(space == null ? "" : space.getSpaceCode())
                .spaceName(space == null ? "未知空间" : space.getSpaceName())
                .spaceStatus(space == null ? null : space.getStatus())
                .spaceVisibility(space == null ? null : space.getVisibility())
                .title(title)
                .summary(summary)
                .visibility(visibility)
                .visibilityText(ContentGovernanceConstants.visibilityText(visibility))
                .deleted(Boolean.TRUE.equals(deleted))
                .authorAmourId(author == null ? "" : StrUtil.blankToDefault(author.getAmourId(), ""))
                .authorName(author == null ? "恋人" : StrUtil.blankToDefault(author.getDisplayName(), "恋人"))
                .chapterId(chapterId)
                .chapterName(chapterName)
                .photoCategoryId(photoCategoryId)
                .categoryName(categoryText)
                .happenedTime(happenedTime)
                .createTime(createTime)
                .updateTime(updateTime)
                .replyCount(replyCount)
                .build();
    }

    private DetailContext loadDetailContext(String contentType, Long contentId, Long requestedSpaceId) {
        Long spaceId = requestedSpaceId;
        if (spaceId == null) {
            if (!adminAuthorizationService.hasPermission(AdminPermissionConstants.CONTENT_CROSS_SPACE)) {
                throw new BizException(ResponseCodeEnum.CONTENT_CROSS_SPACE_FORBIDDEN);
            }
            spaceId = findSpaceIdByContentId(contentType, contentId);
            if (spaceId == null) {
                throw new BizException(ResponseCodeEnum.CONTENT_NOT_IN_SPACE);
            }
        } else {
            requireSpace(spaceId);
        }

        if (ContentGovernanceConstants.TYPE_STORY.equals(contentType)) {
            StoryNodeDO story = storyNodeMapper.selectAdminById(spaceId, contentId);
            if (story == null) {
                throw new BizException(ResponseCodeEnum.CONTENT_NOT_IN_SPACE);
            }
            return new DetailContext(contentType, spaceId, story, null, null, null);
        }
        if (ContentGovernanceConstants.TYPE_PHOTO.equals(contentType)) {
            PhotoDO photo = photoMapper.findAdminById(spaceId, contentId);
            if (photo == null) {
                throw new BizException(ResponseCodeEnum.CONTENT_NOT_IN_SPACE);
            }
            return new DetailContext(contentType, spaceId, null, photo, null, null);
        }
        if (ContentGovernanceConstants.TYPE_ANNIVERSARY.equals(contentType)) {
            AnniversaryDO anniversary = anniversaryMapper.selectAdminById(spaceId, contentId);
            if (anniversary == null) {
                throw new BizException(ResponseCodeEnum.CONTENT_NOT_IN_SPACE);
            }
            return new DetailContext(contentType, spaceId, null, null, anniversary, null);
        }
        MessageDO message = messageMapper.findById(spaceId, contentId);
        if (message == null) {
            throw new BizException(ResponseCodeEnum.CONTENT_NOT_IN_SPACE);
        }
        return new DetailContext(contentType, spaceId, null, null, null, message);
    }

    private Long findSpaceIdByContentId(String contentType, Long contentId) {
        if (ContentGovernanceConstants.TYPE_STORY.equals(contentType)) {
            StoryNodeDO story = storyNodeMapper.selectById(contentId);
            return story == null ? null : story.getSpaceId();
        }
        if (ContentGovernanceConstants.TYPE_PHOTO.equals(contentType)) {
            PhotoDO photo = photoMapper.selectById(contentId);
            return photo == null ? null : photo.getSpaceId();
        }
        if (ContentGovernanceConstants.TYPE_ANNIVERSARY.equals(contentType)) {
            AnniversaryDO anniversary = anniversaryMapper.selectById(contentId);
            return anniversary == null ? null : anniversary.getSpaceId();
        }
        MessageDO message = messageMapper.selectById(contentId);
        return message == null ? null : message.getSpaceId();
    }

    private AdminContentDetailRspVO buildDetail(String contentType, DetailContext context) {
        CoupleSpaceDO space = requireSpace(context.spaceId);
        String authorAmourId = "";
        String authorName = "恋人";
        String title = "";
        String summary = "";
        String content = null;
        String happenedTime = null;
        String location = null;
        String coverImage = null;
        String tagLabel = null;
        String tagColor = null;
        Boolean milestone = null;
        Long chapterId = null;
        String chapterName = null;
        Long photoCategoryId = null;
        String categoryName = null;
        String photoUrl = null;
        String anniversaryDate = null;
        Integer repeatType = null;
        String category = null;
        String colorCode = null;
        Integer sortOrder = null;
        Integer visibility = ContentGovernanceConstants.VISIBILITY_MEMBER_ONLY;
        Boolean deleted = false;
        String createTime = "";
        String updateTime = "";
        Integer replyCount = null;
        List<AdminContentDetailRspVO.ImageVO> images = Collections.emptyList();
        Long authorId = null;

        if (context.story != null) {
            StoryNodeDO story = context.story;
            title = story.getTitle();
            summary = story.getSummary();
            content = story.getContent();
            happenedTime = format(story.getHappenedTime());
            location = story.getLocation();
            coverImage = story.getCoverImage();
            tagLabel = story.getTagLabel();
            tagColor = story.getTagColor();
            milestone = story.getIsMilestone();
            chapterId = story.getChapterId();
            StoryChapterDO chapter = storyChapterMapper.selectChapterById(context.spaceId, story.getChapterId());
            chapterName = chapter == null ? "" : chapter.getName();
            images = storyNodeImageMapper.selectByNodeId(context.spaceId, story.getId()).stream()
                    .map(image -> AdminContentDetailRspVO.ImageVO.builder()
                            .id(image.getId())
                            .url(image.getUrl())
                            .altText(image.getAltText())
                            .sortOrder(image.getSortOrder())
                            .build())
                    .collect(Collectors.toList());
            visibility = story.getVisibility();
            deleted = story.getIsDeleted();
            authorId = story.getCreatedBy();
            createTime = format(story.getCreateTime());
            updateTime = format(story.getUpdateTime());
        } else if (context.photo != null) {
            PhotoDO photo = context.photo;
            title = photo.getTitle();
            summary = photo.getDescription();
            content = photo.getDescription();
            photoUrl = photo.getUrl();
            happenedTime = format(photo.getTakenTime());
            location = photo.getLocation();
            photoCategoryId = photo.getPhotoCategoryId();
            PhotoCategoryDO photoCategory = photoCategoryMapper.findCategoryById(
                    context.spaceId, photo.getPhotoCategoryId());
            categoryName = photoCategory == null ? "未分类" : photoCategory.getCategoryName();
            visibility = photo.getVisibility();
            deleted = photo.getIsDeleted();
            authorId = photo.getCreatedBy();
            createTime = format(photo.getCreateTime());
            updateTime = format(photo.getUpdateTime());
        } else if (context.anniversary != null) {
            AnniversaryDO anniversary = context.anniversary;
            title = anniversary.getTitle();
            summary = anniversary.getDescription();
            content = anniversary.getDescription();
            anniversaryDate = anniversary.getAnniversaryDate() == null
                    ? null : anniversary.getAnniversaryDate().toString();
            repeatType = anniversary.getRepeatType();
            category = anniversary.getCategory();
            colorCode = anniversary.getColorCode();
            sortOrder = anniversary.getSortOrder();
            location = anniversary.getLocation();
            visibility = anniversary.getVisibility();
            deleted = anniversary.getIsDeleted();
            authorId = anniversary.getCreatedBy();
            createTime = format(anniversary.getCreateTime());
            updateTime = format(anniversary.getUpdateTime());
        } else {
            MessageDO message = context.message;
            title = StrUtil.maxLength(StrUtil.blankToDefault(message.getContent(), ""), 80);
            content = message.getContent();
            happenedTime = format(message.getCreateTime());
            deleted = message.getIsDeleted();
            authorId = message.getUserId();
            createTime = format(message.getCreateTime());
            updateTime = format(message.getUpdateTime());
            replyCount = messageReplyMapper.selectActiveByMessageIds(
                    context.spaceId, Collections.singletonList(message.getId())).size();
        }

        if (authorId != null) {
            List<UserDO> users = userMapper.findUsersByIds(Collections.singletonList(authorId));
            UserDO author = CollUtil.isEmpty(users) ? null : users.get(0);
            authorAmourId = author == null ? "" : StrUtil.blankToDefault(author.getAmourId(), "");
            authorName = author == null ? "恋人" : StrUtil.blankToDefault(author.getDisplayName(), "恋人");
        }

        return AdminContentDetailRspVO.builder()
                .contentType(contentType)
                .contentTypeText(ContentGovernanceConstants.contentTypeText(contentType))
                .contentId(context.contentId)
                .spaceId(context.spaceId)
                .spaceCode(space.getSpaceCode())
                .spaceName(space.getSpaceName())
                .spaceDescription(space.getDescription())
                .spaceStatus(space.getStatus())
                .spaceStatusText(spaceStatusText(space.getStatus()))
                .spaceVisibility(space.getVisibility())
                .spaceVisibilityText(spaceVisibilityText(space.getVisibility()))
                .title(title)
                .summary(summary)
                .content(content)
                .happenedTime(happenedTime)
                .location(location)
                .coverImage(coverImage)
                .tagLabel(tagLabel)
                .tagColor(tagColor)
                .milestone(milestone)
                .chapterId(chapterId)
                .chapterName(chapterName)
                .photoCategoryId(photoCategoryId)
                .categoryName(categoryName)
                .photoUrl(photoUrl)
                .anniversaryDate(anniversaryDate)
                .repeatType(repeatType)
                .category(category)
                .colorCode(colorCode)
                .sortOrder(sortOrder)
                .visibility(visibility)
                .visibilityText(ContentGovernanceConstants.visibilityText(visibility))
                .deleted(Boolean.TRUE.equals(deleted))
                .authorAmourId(authorAmourId)
                .authorName(authorName)
                .createTime(createTime)
                .updateTime(updateTime)
                .replyCount(replyCount)
                .images(images)
                .build();
    }

    private Integer requireContentVisibility(String contentType, Long spaceId, Long contentId) {
        Integer visibility;
        Boolean deleted;
        if (ContentGovernanceConstants.TYPE_STORY.equals(contentType)) {
            StoryNodeDO story = storyNodeMapper.selectAdminById(spaceId, contentId);
            if (story == null) {
                throw new BizException(ResponseCodeEnum.CONTENT_NOT_IN_SPACE);
            }
            visibility = story.getVisibility();
            deleted = story.getIsDeleted();
        } else if (ContentGovernanceConstants.TYPE_PHOTO.equals(contentType)) {
            PhotoDO photo = photoMapper.findAdminById(spaceId, contentId);
            if (photo == null) {
                throw new BizException(ResponseCodeEnum.CONTENT_NOT_IN_SPACE);
            }
            visibility = photo.getVisibility();
            deleted = photo.getIsDeleted();
        } else if (ContentGovernanceConstants.TYPE_ANNIVERSARY.equals(contentType)) {
            AnniversaryDO anniversary = anniversaryMapper.selectAdminById(spaceId, contentId);
            if (anniversary == null) {
                throw new BizException(ResponseCodeEnum.CONTENT_NOT_IN_SPACE);
            }
            visibility = anniversary.getVisibility();
            deleted = anniversary.getIsDeleted();
        } else if (ContentGovernanceConstants.TYPE_MESSAGE.equals(contentType)) {
            MessageDO message = messageMapper.findById(spaceId, contentId);
            if (message == null) {
                throw new BizException(ResponseCodeEnum.CONTENT_NOT_IN_SPACE);
            }
            visibility = ContentGovernanceConstants.VISIBILITY_MEMBER_ONLY;
            deleted = message.getIsDeleted();
        } else {
            throw new BizException(ResponseCodeEnum.CONTENT_TYPE_NOT_SUPPORTED);
        }
        if (Boolean.TRUE.equals(deleted)) {
            throw new BizException(ResponseCodeEnum.CONTENT_ALREADY_DELETED);
        }
        return visibility;
    }

    private Long resolveListSpaceId(Long requestedSpaceId) {
        if (requestedSpaceId != null) {
            requireSpace(requestedSpaceId);
            return requestedSpaceId;
        }
        if (!adminAuthorizationService.hasPermission(AdminPermissionConstants.CONTENT_CROSS_SPACE)) {
            throw new BizException(ResponseCodeEnum.CONTENT_CROSS_SPACE_FORBIDDEN);
        }
        return null;
    }

    private String requireSupportedContentType(String contentType) {
        String normalized = StrUtil.trim(contentType);
        if (StrUtil.isBlank(normalized)) {
            throw new BizException(ResponseCodeEnum.CONTENT_TYPE_NOT_SUPPORTED);
        }
        normalized = normalized.toLowerCase(Locale.ROOT);
        if (!ContentGovernanceConstants.isSupportedContentType(normalized)) {
            throw new BizException(ResponseCodeEnum.CONTENT_TYPE_NOT_SUPPORTED);
        }
        return normalized;
    }

    private String requireReason(String reason) {
        String trimmed = StrUtil.trim(reason);
        if (StrUtil.isBlank(trimmed)) {
            throw new BizException(ResponseCodeEnum.REASON_REQUIRED);
        }
        if (trimmed.length() > 500) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        return trimmed;
    }

    private CoupleSpaceDO requireSpace(Long spaceId) {
        CoupleSpaceDO space = coupleSpaceMapper.findById(spaceId);
        if (space == null) {
            throw new BizException(ResponseCodeEnum.SPACE_NOT_EXIST);
        }
        return space;
    }

    private Map<Long, CoupleSpaceDO> loadSpaces(Collection<Long> spaceIds) {
        Set<Long> ids = spaceIds.stream().filter(Objects::nonNull).collect(Collectors.toSet());
        if (ids.isEmpty()) {
            return Collections.emptyMap();
        }
        return coupleSpaceMapper.selectBatchIds(ids).stream()
                .collect(Collectors.toMap(CoupleSpaceDO::getId, Function.identity(), (left, right) -> left));
    }

    private Map<Long, UserDO> loadUsers(Collection<Long> userIds) {
        Set<Long> ids = userIds.stream().filter(Objects::nonNull).collect(Collectors.toSet());
        if (ids.isEmpty()) {
            return Collections.emptyMap();
        }
        return userMapper.findUsersByIds(ids).stream()
                .collect(Collectors.toMap(UserDO::getId, Function.identity(), (left, right) -> left));
    }

    private Map<Long, String> loadChapterNames(Collection<Long> chapterIds) {
        Set<Long> ids = chapterIds.stream().filter(Objects::nonNull).collect(Collectors.toSet());
        if (ids.isEmpty()) {
            return Collections.emptyMap();
        }
        return storyChapterMapper.selectBatchIds(ids).stream()
                .collect(Collectors.toMap(StoryChapterDO::getId, StoryChapterDO::getName, (left, right) -> left));
    }

    private Map<Long, String> loadCategoryNames(Collection<Long> categoryIds) {
        Set<Long> ids = categoryIds.stream().filter(Objects::nonNull).collect(Collectors.toSet());
        if (ids.isEmpty()) {
            return Collections.emptyMap();
        }
        return photoCategoryMapper.selectBatchIds(ids).stream()
                .collect(Collectors.toMap(PhotoCategoryDO::getId, PhotoCategoryDO::getCategoryName,
                        (left, right) -> left));
    }

    private Map<Long, Integer> loadReplyCounts(List<MessageDO> messages) {
        Map<Long, List<Long>> messageIdsBySpace = messages.stream()
                .filter(message -> message.getSpaceId() != null)
                .collect(Collectors.groupingBy(MessageDO::getSpaceId,
                        Collectors.mapping(MessageDO::getId, Collectors.toList())));
        Map<Long, Integer> counts = new HashMap<>();
        for (Map.Entry<Long, List<Long>> entry : messageIdsBySpace.entrySet()) {
            List<MessageReplyDO> replies = messageReplyMapper.selectActiveByMessageIds(
                    entry.getKey(), entry.getValue());
            Map<Long, Long> grouped = replies.stream()
                    .collect(Collectors.groupingBy(MessageReplyDO::getMessageId, Collectors.counting()));
            grouped.forEach((messageId, count) -> counts.put(messageId, count.intValue()));
        }
        return counts;
    }

    private void recordFailure(String action, Long spaceId, String contentType, Long contentId,
                               Long adminUserId, String reason, RuntimeException exception) {
        try {
            adminAuditService.recordFailure(AdminAuditLogDO.builder()
                    .adminUserId(adminUserId)
                    .action(action)
                    .targetType(AdminAuditConstants.TARGET_CONTENT)
                    .targetSpaceId(spaceId)
                    .targetContentType(contentType)
                    .targetContentId(contentId)
                    .reason(reason)
                    .result(AdminAuditConstants.RESULT_FAILURE)
                    .detail(exception instanceof BizException
                            ? ((BizException) exception).getErrorCode() : "SYSTEM_ERROR")
                    .createTime(LocalDateTime.now())
                    .build());
        } catch (Exception auditException) {
            log.error("内容治理失败审计记录失败，type: {}, id: {}", contentType, contentId, auditException);
        }
    }

    private String format(LocalDateTime time) {
        return time == null ? "" : FORMATTER.format(time);
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

    private static final class DetailContext {
        private final String contentType;
        private final Long spaceId;
        private final Long contentId;
        private final Integer visibility;
        private final Boolean deleted;
        private final StoryNodeDO story;
        private final PhotoDO photo;
        private final AnniversaryDO anniversary;
        private final MessageDO message;

        private DetailContext(String contentType, Long spaceId, StoryNodeDO story, PhotoDO photo,
                              AnniversaryDO anniversary, MessageDO message) {
            this.contentType = contentType;
            this.spaceId = spaceId;
            this.story = story;
            this.photo = photo;
            this.anniversary = anniversary;
            this.message = message;
            if (story != null) {
                this.contentId = story.getId();
                this.visibility = story.getVisibility();
                this.deleted = story.getIsDeleted();
            } else if (photo != null) {
                this.contentId = photo.getId();
                this.visibility = photo.getVisibility();
                this.deleted = photo.getIsDeleted();
            } else if (anniversary != null) {
                this.contentId = anniversary.getId();
                this.visibility = anniversary.getVisibility();
                this.deleted = anniversary.getIsDeleted();
            } else {
                this.contentId = message.getId();
                this.visibility = ContentGovernanceConstants.VISIBILITY_MEMBER_ONLY;
                this.deleted = message.getIsDeleted();
            }
        }
    }
}
