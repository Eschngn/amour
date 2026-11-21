package com.chengliuxiang.amour.web.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import com.chengliuxiang.amour.common.constant.SpaceReviewConstants;
import com.chengliuxiang.amour.common.domain.dos.StoryChapterDO;
import com.chengliuxiang.amour.common.domain.dos.StoryNodeDO;
import com.chengliuxiang.amour.common.domain.mapper.StoryChapterMapper;
import com.chengliuxiang.amour.common.domain.mapper.StoryNodeMapper;
import com.chengliuxiang.amour.common.enums.ResponseCodeEnum;
import com.chengliuxiang.amour.common.exception.BizException;
import com.chengliuxiang.amour.common.utils.Response;
import com.chengliuxiang.amour.web.model.vo.space.SpaceContentSaveResultVO;
import com.chengliuxiang.amour.web.model.vo.space.SpaceItemReviewStateVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryChapterIdReqVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryChapterManageVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryChapterOrderReqVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryChapterSaveReqVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryNodeGlobalOrderReqVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryNodeIdReqVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryNodeManageVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryNodeOrderReqVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryNodeSaveReqVO;
import com.chengliuxiang.amour.web.model.vo.story.StoryNodeSortItemVO;
import com.chengliuxiang.amour.web.model.vo.space.SortOrderItemVO;
import com.chengliuxiang.amour.web.service.SpaceContentAccessService;
import com.chengliuxiang.amour.web.service.SpaceReviewService;
import com.chengliuxiang.amour.web.service.SpaceStoryManageService;
import com.chengliuxiang.amour.web.utils.SpaceSortOrderUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class SpaceStoryManageServiceImpl implements SpaceStoryManageService {

    private static final int VISIBILITY_MEMBER = 0;
    private static final int VISIBILITY_PUBLIC = 1;
    private static final int VISIBILITY_HIDDEN = 2;

    @Resource
    private SpaceContentAccessService spaceContentAccessService;

    @Resource
    private StoryChapterMapper storyChapterMapper;

    @Resource
    private StoryNodeMapper storyNodeMapper;

    @Resource
    private SpaceReviewService spaceReviewService;

    @Override
    public Response<List<StoryChapterManageVO>> listChapters() {
        Long spaceId = spaceContentAccessService.requireReadableSpaceId();
        List<StoryChapterDO> chapters = storyChapterMapper.selectManageList(spaceId);
        List<StoryChapterManageVO> records = chapters.stream()
                .map(chapter -> StoryChapterManageVO.builder()
                        .id(chapter.getId())
                        .name(chapter.getName())
                        .sortOrder(chapter.getSortOrder())
                        .isVisible(chapter.getIsVisible())
                        .nodeCount(storyNodeMapper.countByChapterId(spaceId, chapter.getId()).intValue())
                        .build())
                .collect(Collectors.toList());
        return Response.success(records);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<Long> saveChapter(StoryChapterSaveReqVO reqVO) {
        SpaceContentAccessService.SpaceAccess access = spaceContentAccessService.requireEditable();
        Long spaceId = access.getSpaceId();

        String name = StrUtil.trim(reqVO.getName());
        if (StrUtil.isBlank(name) || name.length() > 50) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        Long excludedId = reqVO.getId();
        Long duplicate = storyChapterMapper.countByName(spaceId, name, excludedId);
        if (duplicate != null && duplicate > 0) {
            throw new BizException(ResponseCodeEnum.CHAPTER_NAME_DUPLICATE);
        }

        LocalDateTime now = LocalDateTime.now();
        if (reqVO.getId() == null) {
            StoryChapterDO chapter = StoryChapterDO.builder()
                    .spaceId(spaceId)
                    .name(name)
                    .sortOrder(reqVO.getSortOrder() == null ? nextChapterSortOrder(spaceId) : reqVO.getSortOrder())
                    .isVisible(reqVO.getIsVisible() == null || reqVO.getIsVisible())
                    .createdBy(access.getUserId())
                    .createTime(now)
                    .updateTime(now)
                    .build();
            storyChapterMapper.insert(chapter);
            return Response.success(chapter.getId());
        }

        StoryChapterDO current = requireChapter(spaceId, reqVO.getId());
        current.setName(name);
        current.setSortOrder(reqVO.getSortOrder() == null
                ? (current.getSortOrder() == null ? 0 : current.getSortOrder())
                : reqVO.getSortOrder());
        current.setIsVisible(reqVO.getIsVisible() == null
                ? (current.getIsVisible() == null || current.getIsVisible())
                : reqVO.getIsVisible());
        current.setUpdateTime(now);
        int updated = storyChapterMapper.updateChapter(current);
        if (updated == 0) {
            throw new BizException(ResponseCodeEnum.CHAPTER_NOT_EXIST);
        }
        return Response.success(current.getId());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<Void> deleteChapter(StoryChapterIdReqVO reqVO) {
        Long spaceId = spaceContentAccessService.requireEditableSpaceId();
        requireChapter(spaceId, reqVO.getId());
        Long nodeCount = storyNodeMapper.countByChapterId(spaceId, reqVO.getId());
        if (nodeCount != null && nodeCount > 0) {
            throw new BizException(ResponseCodeEnum.SPACE_CHAPTER_NOT_EMPTY);
        }
        int deleted = storyChapterMapper.deleteChapter(spaceId, reqVO.getId());
        if (deleted == 0) {
            throw new BizException(ResponseCodeEnum.CHAPTER_NOT_EXIST);
        }
        return Response.success();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<Void> saveChapterOrder(StoryChapterOrderReqVO reqVO) {
        Long spaceId = spaceContentAccessService.requireEditableSpaceId();
        List<Long> orderedIds = SpaceSortOrderUtils.orderedDistinctIds(reqVO.getItems());
        List<StoryChapterDO> chapters = storyChapterMapper.selectChaptersByIds(spaceId, orderedIds);
        if (chapters.size() != orderedIds.size()) {
            throw new BizException(ResponseCodeEnum.SPACE_CONTENT_NOT_IN_SPACE);
        }
        for (int index = 0; index < orderedIds.size(); index++) {
            int updated = storyChapterMapper.updateSortOrder(
                    spaceId, orderedIds.get(index), SpaceSortOrderUtils.sortOrderAt(index));
            if (updated == 0) {
                throw new BizException(ResponseCodeEnum.SPACE_CONTENT_NOT_IN_SPACE);
            }
        }
        return Response.success();
    }

    @Override
    public Response<List<StoryNodeManageVO>> listNodes() {
        Long spaceId = spaceContentAccessService.requireReadableSpaceId();
        List<StoryNodeDO> nodes = storyNodeMapper.selectManageList(spaceId);
        if (CollUtil.isEmpty(nodes)) {
            return Response.success(Collections.emptyList());
        }
        Map<Long, StoryChapterDO> chapterMap = storyChapterMapper.selectBySpaceId(spaceId).stream()
                .collect(Collectors.toMap(StoryChapterDO::getId, Function.identity(), (left, right) -> left));
        Map<String, SpaceItemReviewStateVO> reviewStates = spaceReviewService.loadItemReviewStates(spaceId);

        List<StoryNodeManageVO> records = nodes.stream()
                .map(node -> {
                    StoryChapterDO chapter = chapterMap.get(node.getChapterId());
                    SpaceItemReviewStateVO reviewState = reviewStates.get(
                            SpaceReviewConstants.ITEM_TYPE_STORY + ":" + node.getId());
                    return StoryNodeManageVO.builder()
                            .id(node.getId())
                            .chapterId(node.getChapterId())
                            .chapterName(chapter == null ? "" : chapter.getName())
                            .title(node.getTitle())
                            .summary(node.getSummary())
                            .content(node.getContent())
                            .happenedTime(node.getHappenedTime())
                            .showTime(node.getShowTime() == null || node.getShowTime())
                            .location(node.getLocation())
                            .coverImage(node.getCoverImage())
                            .tagLabel(node.getTagLabel())
                            .sortOrder(node.getSortOrder())
                            .globalSortOrder(node.getGlobalSortOrder())
                            .isMilestone(node.getIsMilestone())
                            .visibility(node.getVisibility())
                            .reviewStatus(reviewState == null ? null : reviewState.getReviewStatus())
                            .reviewRejectReason(reviewState == null
                                    ? null : reviewState.getReviewRejectReason())
                            .reviewHandledAt(reviewState == null
                                    ? null : reviewState.getReviewHandledAt())
                            .reviewHasPublishedVersion(reviewState == null
                                    ? null : reviewState.getHasPublishedVersion())
                            .build();
                })
                .collect(Collectors.toList());
        return Response.success(records);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<SpaceContentSaveResultVO> saveNode(StoryNodeSaveReqVO reqVO) {
        SpaceContentAccessService.SpaceAccess access = spaceContentAccessService.requireEditable();
        Long spaceId = access.getSpaceId();

        if (reqVO.getChapterId() == null) {
            throw new BizException(ResponseCodeEnum.CHAPTER_NOT_EXIST);
        }
        requireChapter(spaceId, reqVO.getChapterId());

        String title = StrUtil.trim(reqVO.getTitle());
        String content = StrUtil.trim(reqVO.getContent());
        if (StrUtil.isBlank(title) || StrUtil.isBlank(content) || reqVO.getHappenedTime() == null) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        Integer visibility = resolveVisibility(reqVO.getVisibility(), access);

        LocalDateTime now = LocalDateTime.now();
        StoryNodeDO node;
        if (reqVO.getId() == null) {
            boolean showTime = resolveShowTime(reqVO.getShowTime(), null);
            LocalDateTime happenedTime = normalizeHappenedTime(reqVO.getHappenedTime(), showTime);
            // 历史公开空间先把当前公开数据固化为已发布版本，本次修改只进入待审核快照。
            spaceReviewService.prepareForPublicEdit(spaceId);
            node = StoryNodeDO.builder()
                    .spaceId(spaceId)
                    .chapterId(reqVO.getChapterId())
                    .title(title)
                    .summary(StrUtil.nullToEmpty(StrUtil.trim(reqVO.getSummary())))
                    .content(content)
                    .happenedTime(happenedTime)
                    .showTime(showTime)
                    .location(StrUtil.nullToEmpty(StrUtil.trim(reqVO.getLocation())))
                    .coverImage(StrUtil.nullToEmpty(StrUtil.trim(reqVO.getCoverImage())))
                    .tagLabel(StrUtil.nullToEmpty(StrUtil.trim(reqVO.getTagLabel())))
                    .sortOrder(resolveNewNodeSortOrder(spaceId, reqVO.getChapterId(), reqVO.getSortOrder()))
                    // 新故事追加到全部故事末尾，章节内排序仍由 sortOrder 单独维护。
                    .globalSortOrder(nextNodeGlobalSortOrder(spaceId))
                    .isMilestone(Boolean.TRUE.equals(reqVO.getIsMilestone()))
                    .visibility(visibility)
                    .isDeleted(false)
                    .createdBy(access.getUserId())
                    .updatedBy(access.getUserId())
                    .revision(1)
                    .createTime(now)
                    .updateTime(now)
                    .build();
            storyNodeMapper.insertStoryNode(node);
        } else {
            StoryNodeDO current = requireNode(spaceId, reqVO.getId());
            boolean showTime = resolveShowTime(reqVO.getShowTime(), current);
            LocalDateTime happenedTime = normalizeHappenedTime(reqVO.getHappenedTime(), showTime);
            // 重复保存相同内容不递增版本，也不产生无意义的待审核项。
            if (!isStoryChanged(current, reqVO, visibility, showTime, happenedTime)) {
                return Response.success(spaceReviewService.onContentUnchanged(
                        spaceId, SpaceReviewConstants.ITEM_TYPE_STORY, current.getId()));
            }
            // 历史公开空间先把当前公开数据固化为已发布版本，本次修改只进入待审核快照。
            spaceReviewService.prepareForPublicEdit(spaceId);
            node = StoryNodeDO.builder()
                    .id(current.getId())
                    .spaceId(spaceId)
                    .chapterId(reqVO.getChapterId())
                    .title(title)
                    .summary(StrUtil.nullToEmpty(StrUtil.trim(reqVO.getSummary())))
                    .content(content)
                    .happenedTime(happenedTime)
                    .showTime(showTime)
                    .location(StrUtil.nullToEmpty(StrUtil.trim(reqVO.getLocation())))
                    .coverImage(StrUtil.nullToEmpty(StrUtil.trim(reqVO.getCoverImage())))
                    .tagLabel(StrUtil.nullToEmpty(StrUtil.trim(reqVO.getTagLabel())))
                    // 改章节时追加到目标章节末尾；未改章节时保留原章节内顺序。
                    .sortOrder(resolveUpdatedNodeSortOrder(spaceId, current, reqVO))
                    .isMilestone(Boolean.TRUE.equals(reqVO.getIsMilestone()))
                    .visibility(visibility)
                    .updatedBy(access.getUserId())
                    .updateTime(now)
                    .build();
            int updated = storyNodeMapper.updateStoryNode(node);
            if (updated == 0) {
                throw new BizException(ResponseCodeEnum.STORY_NOT_EXIST);
            }
        }

        return Response.success(spaceReviewService.onContentSaved(
                spaceId, access.getUserId(), SpaceReviewConstants.ITEM_TYPE_STORY, node.getId(), false));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<List<StoryNodeSortItemVO>> saveNodeOrder(StoryNodeOrderReqVO reqVO) {
        Long spaceId = spaceContentAccessService.requireEditableSpaceId();
        Long chapterId = reqVO.getChapterId();
        requireChapter(spaceId, chapterId);
        List<StoryNodeDO> chapterNodes = storyNodeMapper.selectActiveByChapterId(spaceId, chapterId);

        // 章节内排序只写 sort_order；global_sort_order 完全不动，全部故事视图保持原顺序。
        List<StoryNodeDO> ordered = resolveScopedOrder(chapterNodes, reqVO.getItems());
        for (int index = 0; index < ordered.size(); index++) {
            int updated = storyNodeMapper.updateSortOrder(
                    spaceId, chapterId, ordered.get(index).getId(), SpaceSortOrderUtils.sortOrderAt(index));
            if (updated == 0) {
                throw new BizException(ResponseCodeEnum.SPACE_CONTENT_NOT_IN_SPACE);
            }
        }
        return Response.success(toSortItems(storyNodeMapper.selectActiveByChapterId(spaceId, chapterId)));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<List<StoryNodeSortItemVO>> saveNodeGlobalOrder(StoryNodeGlobalOrderReqVO reqVO) {
        Long spaceId = spaceContentAccessService.requireEditableSpaceId();
        List<StoryNodeDO> allNodes = storyNodeMapper.selectManageList(spaceId);

        // 全局排序只写 global_sort_order；各章节的 sort_order 保持不变。
        List<StoryNodeDO> ordered = resolveScopedOrder(allNodes, reqVO.getItems());
        for (int index = 0; index < ordered.size(); index++) {
            int updated = storyNodeMapper.updateGlobalSortOrder(
                    spaceId, ordered.get(index).getId(), SpaceSortOrderUtils.sortOrderAt(index));
            if (updated == 0) {
                throw new BizException(ResponseCodeEnum.SPACE_CONTENT_NOT_IN_SPACE);
            }
        }
        return Response.success(toSortItems(storyNodeMapper.selectManageList(spaceId)));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Response<Void> deleteNode(StoryNodeIdReqVO reqVO) {
        SpaceContentAccessService.SpaceAccess access = spaceContentAccessService.requireEditable();
        spaceReviewService.prepareForPublicEdit(access.getSpaceId());
        requireNode(access.getSpaceId(), reqVO.getId());
        int deleted = storyNodeMapper.softDelete(access.getSpaceId(), reqVO.getId(),
                access.getUserId(), LocalDateTime.now());
        if (deleted == 0) {
            throw new BizException(ResponseCodeEnum.STORY_NOT_EXIST);
        }
        // 删除属于缩小公开范围，立即从广场移除并撤回该项的待审核版本。
        spaceReviewService.onContentSaved(access.getSpaceId(), access.getUserId(),
                SpaceReviewConstants.ITEM_TYPE_STORY, reqVO.getId(), true);
        return Response.success();
    }

    private Integer resolveVisibility(Integer requested, SpaceContentAccessService.SpaceAccess access) {
        int visibility = requested == null ? VISIBILITY_MEMBER : requested;
        if (visibility != VISIBILITY_MEMBER && visibility != VISIBILITY_PUBLIC && visibility != VISIBILITY_HIDDEN) {
            throw new BizException(ResponseCodeEnum.PARAM_NOT_VALID);
        }
        if (visibility == VISIBILITY_PUBLIC && !access.canPublishContent()) {
            throw new BizException(ResponseCodeEnum.SPACE_CONTENT_PUBLISH_NOT_ALLOWED);
        }
        return visibility;
    }

    /**
     * 解析时间展示精度。
     *
     * <p>编辑时未传字段表示旧客户端请求，必须保留原记录选项；
     * 新建未传字段与历史记录缺失值统一按“展示日期和时间”兼容。</p>
     */
    private boolean resolveShowTime(Boolean requested, StoryNodeDO current) {
        if (requested != null) {
            return requested;
        }
        if (current == null || current.getShowTime() == null) {
            return true;
        }
        return current.getShowTime();
    }

    /**
     * 仅日期模式统一持久化为当天 00:00:00，避免残留的时分秒影响展示与排序。
     */
    private LocalDateTime normalizeHappenedTime(LocalDateTime value, boolean showTime) {
        if (value == null) {
            return null;
        }
        return showTime ? value : value.toLocalDate().atStartOfDay();
    }

    /**
     * 判断本次保存是否真正改变了工作数据。
     *
     * <p>只比较保存接口会写入的字段，忽略数据库自增 ID 与对象序列化差异；
     * 排序值也属于真实变更，因为会改变恋爱广场的故事顺序。
     * 历史故事附图不再参与保存，也不会影响变化判定；
     * 颜色字段下线后不再参与变更判定。</p>
     */
    private boolean isStoryChanged(StoryNodeDO current, StoryNodeSaveReqVO reqVO, int visibility,
                                   boolean showTime, LocalDateTime happenedTime) {
        String requestedTagLabel = StrUtil.nullToEmpty(StrUtil.trim(reqVO.getTagLabel()));
        return !Objects.equals(current.getChapterId(), reqVO.getChapterId())
                || !sameText(current.getTitle(), reqVO.getTitle())
                || !sameText(current.getSummary(), reqVO.getSummary())
                || !sameText(current.getContent(), reqVO.getContent())
                || !Objects.equals(current.getHappenedTime(), happenedTime)
                || !Objects.equals(current.getShowTime() == null || current.getShowTime(), showTime)
                || !sameText(current.getLocation(), reqVO.getLocation())
                || !sameText(current.getCoverImage(), reqVO.getCoverImage())
                || !sameText(current.getTagLabel(), requestedTagLabel)
                || !Objects.equals(currentSortOrder(current), requestedSortOrder(reqVO, current))
                || !Objects.equals(Boolean.TRUE.equals(current.getIsMilestone()),
                        Boolean.TRUE.equals(reqVO.getIsMilestone()))
                || !Objects.equals(current.getVisibility() == null ? 0 : current.getVisibility(),
                        visibility);
    }

    private boolean sameText(String left, String right) {
        return Objects.equals(
                StrUtil.nullToEmpty(StrUtil.trim(left)),
                StrUtil.nullToEmpty(StrUtil.trim(right)));
    }

    private int currentSortOrder(StoryNodeDO current) {
        return current.getSortOrder() == null ? 0 : current.getSortOrder();
    }

    private int requestedSortOrder(StoryNodeSaveReqVO reqVO, StoryNodeDO current) {
        return reqVO.getSortOrder() == null ? currentSortOrder(current) : reqVO.getSortOrder();
    }

    private int nextChapterSortOrder(Long spaceId) {
        List<StoryChapterDO> chapters = storyChapterMapper.selectBySpaceId(spaceId);
        int max = 0;
        for (StoryChapterDO chapter : chapters) {
            if (chapter.getSortOrder() != null && chapter.getSortOrder() > max) {
                max = chapter.getSortOrder();
            }
        }
        return max + 10;
    }

    /**
     * 未显式传 sortOrder 时追加到当前章节末尾，避免新故事插到已有顺序最前面。
     */
    private int resolveNewNodeSortOrder(Long spaceId, Long chapterId, Integer requested) {
        return requested != null ? requested : nextNodeSortOrder(spaceId, chapterId);
    }

    /**
     * 编辑故事时的章节内排序：
     * 章节未变时保留调用方显式值或原值；章节变更时追加到目标章节末尾。
     */
    private int resolveUpdatedNodeSortOrder(Long spaceId, StoryNodeDO current, StoryNodeSaveReqVO reqVO) {
        if (!Objects.equals(current.getChapterId(), reqVO.getChapterId())) {
            return nextNodeSortOrder(spaceId, reqVO.getChapterId());
        }
        return reqVO.getSortOrder() == null ? currentSortOrder(current) : reqVO.getSortOrder();
    }

    /** 当前章节内的下一个排序值，保证新内容追加到末尾。 */
    private int nextNodeSortOrder(Long spaceId, Long chapterId) {
        int max = 0;
        for (StoryNodeDO node : storyNodeMapper.selectActiveByChapterId(spaceId, chapterId)) {
            if (node.getSortOrder() != null && node.getSortOrder() > max) {
                max = node.getSortOrder();
            }
        }
        return max + 10;
    }

    /** 全部故事的下一个全局排序值。 */
    private int nextNodeGlobalSortOrder(Long spaceId) {
        return storyNodeMapper.findMaxGlobalSortOrder(spaceId) + 10;
    }

    /**
     * 把排序请求合并为完整的范围顺序。
     *
     * <p>请求中的 ID 必须全部属于当前范围（章节或全部故事）；未提交的范围内条目
     * 保持原相对顺序追加在末尾，避免部分提交造成排序值重复。</p>
     */
    private List<StoryNodeDO> resolveScopedOrder(List<StoryNodeDO> scopeNodes, List<SortOrderItemVO> items) {
        if (CollUtil.isEmpty(items)) {
            return scopeNodes;
        }
        List<Long> orderedIds = SpaceSortOrderUtils.orderedDistinctIds(items);
        Map<Long, StoryNodeDO> nodeMap = scopeNodes.stream()
                .collect(Collectors.toMap(StoryNodeDO::getId, Function.identity(), (left, right) -> left));
        if (!nodeMap.keySet().containsAll(orderedIds)) {
            throw new BizException(ResponseCodeEnum.SPACE_CONTENT_NOT_IN_SPACE);
        }
        List<StoryNodeDO> ordered = new ArrayList<>();
        Set<Long> submitted = new HashSet<>(orderedIds);
        for (Long id : orderedIds) {
            ordered.add(nodeMap.get(id));
        }
        for (StoryNodeDO node : scopeNodes) {
            if (!submitted.contains(node.getId())) {
                ordered.add(node);
            }
        }
        return ordered;
    }

    private List<StoryNodeSortItemVO> toSortItems(List<StoryNodeDO> nodes) {
        return nodes.stream()
                .map(node -> StoryNodeSortItemVO.builder()
                        .id(node.getId())
                        .chapterId(node.getChapterId())
                        .title(node.getTitle())
                        .sortOrder(node.getSortOrder())
                        .globalSortOrder(node.getGlobalSortOrder())
                        .build())
                .collect(Collectors.toList());
    }

    private StoryChapterDO requireChapter(Long spaceId, Long chapterId) {
        StoryChapterDO chapter = storyChapterMapper.selectChapterById(spaceId, chapterId);
        if (chapter == null) {
            throw new BizException(ResponseCodeEnum.CHAPTER_NOT_EXIST);
        }
        return chapter;
    }

    private StoryNodeDO requireNode(Long spaceId, Long nodeId) {
        StoryNodeDO node = storyNodeMapper.selectActiveById(spaceId, nodeId);
        if (node == null) {
            throw new BizException(ResponseCodeEnum.STORY_NOT_EXIST);
        }
        return node;
    }
}
