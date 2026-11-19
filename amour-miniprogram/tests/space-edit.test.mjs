import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * 空间基础信息编辑的纯函数单测（utils/space-edit.js）。
 *
 * 覆盖验收点里最容易出错的三类细节：
 * 1. 后端 `yyyy-MM-dd HH:mm:ss` 不能用 `new Date(str)` 解析（iOS 不兼容）；
 * 2. picker 只有分钟精度：只改名称 / 简介时必须原样保留原始秒数；
 * 3. 清空时间必须提交 null（不是空字符串）。
 */

const {
  SPACE_INFO_NAME_MAX,
  SPACE_INFO_DESCRIPTION_MAX,
  parseBackendDateTime,
  formatLoveStartTime,
  splitLoveStartTime,
  normalizeLoveStartTimePayload,
  composeLoveStartTime,
  buildSpaceInfoBaseline,
  describeSpaceInfo,
  buildSpaceInfoDraft,
  measureText,
  isSpaceInfoDirty,
  buildSpaceInfoUpdatePayload,
  buildSpaceInfoValidationError,
  canEditSpaceInfo,
  isSpaceInfoUpdateConflict,
  buildSpaceInfoErrorMessage,
} = await import('../miniprogram/utils/space-edit.js')

const WAITING_SPACE = {
  spaceId: 101,
  status: 0,
  spaceName: '我们的故事',
  description: '从这里开始',
  loveStartTime: '2024-05-20 19:30:47',
  memberCount: 1,
}

// ============================ 解析 / 格式化 ============================

test('parseBackendDateTime 按字段解析后端时间，不经过 new Date 字符串解析', () => {
  assert.deepEqual(parseBackendDateTime('2024-05-20 19:30:47'), {
    year: 2024, month: 5, day: 20, hour: 19, minute: 30, second: 47,
  })
  // 只有日期时按 00:00:00
  assert.deepEqual(parseBackendDateTime('2024-05-20'), {
    year: 2024, month: 5, day: 20, hour: 0, minute: 0, second: 0,
  })
  // ISO-ish 输入（带 T / 毫秒 / Z）也能拆字段，且不发生时区偏移
  assert.deepEqual(parseBackendDateTime('2024-05-20T19:30:47'), {
    year: 2024, month: 5, day: 20, hour: 19, minute: 30, second: 47,
  })
  assert.deepEqual(parseBackendDateTime('2024-05-20T19:30:47.123Z'), {
    year: 2024, month: 5, day: 20, hour: 19, minute: 30, second: 47,
  })
  // 非法输入一律 null
  assert.equal(parseBackendDateTime(''), null)
  assert.equal(parseBackendDateTime(null), null)
  assert.equal(parseBackendDateTime('not-a-date'), null)
  assert.equal(parseBackendDateTime('2024-02-31 10:00:00'), null, '2 月 31 日不存在')
  assert.equal(parseBackendDateTime('2024-13-01 10:00:00'), null)
})

test('parseBackendDateTime 在非 UTC 时区下也不会把时间偏移（关键回归）', () => {
  const fields = parseBackendDateTime('2024-05-20 19:30:47')
  // 若误用 new Date(...)，在 UTC+8 下 getHours() 会得到 11（或 Invalid Date）
  assert.equal(fields.hour, 19)
  assert.equal(fields.minute, 30)
  assert.equal(fields.second, 47)
})

test('formatLoveStartTime 输出分钟精度展示文本；空值返回空字符串', () => {
  assert.equal(formatLoveStartTime('2024-05-20 19:30:47'), '2024-05-20 19:30')
  assert.equal(formatLoveStartTime('2024-05-20'), '2024-05-20 00:00')
  assert.equal(formatLoveStartTime(''), '')
  assert.equal(formatLoveStartTime(null), '')
  assert.equal(formatLoveStartTime('bad'), '')
})

test('splitLoveStartTime 拆成原生 picker 需要的日期 / 时间值', () => {
  assert.deepEqual(splitLoveStartTime('2024-05-20 19:30:47'), {
    date: '2024-05-20',
    time: '19:30',
  })
  assert.deepEqual(splitLoveStartTime(''), { date: '', time: '' })
})

// ============================ 提交值组装 ============================

test('normalizeLoveStartTimePayload：合法值补秒，空值 / 非法值一律 null', () => {
  assert.equal(normalizeLoveStartTimePayload('2024-05-20 19:30:47'), '2024-05-20 19:30:47')
  assert.equal(normalizeLoveStartTimePayload('2024-05-20 19:30'), '2024-05-20 19:30:00')
  assert.equal(normalizeLoveStartTimePayload('2024-05-20'), '2024-05-20 00:00:00')
  // 清空语义：必须是 null，不能是空字符串
  assert.equal(normalizeLoveStartTimePayload(''), null)
  assert.equal(normalizeLoveStartTimePayload(null), null)
  assert.equal(normalizeLoveStartTimePayload(undefined), null)
  assert.equal(normalizeLoveStartTimePayload('bad'), null)
})

test('只改名称 / 简介时保留原始秒数（2024-05-20 19:30:47 → 19:30:47）', () => {
  const baseline = buildSpaceInfoBaseline(WAITING_SPACE)
  const draft = buildSpaceInfoDraft(baseline)
  assert.deepEqual(draft, {
    spaceName: '我们的故事',
    description: '从这里开始',
    loveDate: '2024-05-20',
    loveTime: '19:30',
  })
  // 草稿里 picker 只到分钟，但提交值必须保留原秒
  assert.equal(draft.loveDate && draft.loveTime ? composeLoveStartTime(draft, baseline.loveStartTime) : null,
    '2024-05-20 19:30:47')
})

test('确实修改了时间（分钟级变化）时秒数按 00 处理', () => {
  const baseline = buildSpaceInfoBaseline(WAITING_SPACE)
  // 改时间
  assert.equal(
    composeLoveStartTime(
      { loveDate: '2024-05-20', loveTime: '20:00' },
      baseline.loveStartTime,
    ),
    '2024-05-20 20:00:00',
  )
  // 改日期
  assert.equal(
    composeLoveStartTime(
      { loveDate: '2024-05-21', loveTime: '19:30' },
      baseline.loveStartTime,
    ),
    '2024-05-21 19:30:00',
  )
  // 原值本身就是秒=00 时没有区别
  assert.equal(
    composeLoveStartTime({ loveDate: '2024-05-20', loveTime: '19:30' }, '2024-05-20 19:30:00'),
    '2024-05-20 19:30:00',
  )
})

test('清空恋爱开始时间提交 null（不是空字符串）', () => {
  const baseline = buildSpaceInfoBaseline(WAITING_SPACE)
  const payload = buildSpaceInfoUpdatePayload(
    { spaceName: '我们的故事', description: '从这里开始', loveDate: '', loveTime: '' },
    baseline,
  )
  assert.deepEqual(payload, {
    spaceName: '我们的故事',
    description: '从这里开始',
    loveStartTime: null,
  })
  assert.notEqual(payload.loveStartTime, '')
  // 基线本来就没有时间时也是 null
  assert.equal(
    buildSpaceInfoUpdatePayload(
      { spaceName: 'x', description: '', loveDate: '', loveTime: '' },
      buildSpaceInfoBaseline({ ...WAITING_SPACE, loveStartTime: null }),
    ).loveStartTime,
    null,
  )
})

test('buildSpaceInfoUpdatePayload 三字段始终显式提交，名称 / 简介 trim 后可为空串', () => {
  const baseline = buildSpaceInfoBaseline(WAITING_SPACE)
  const payload = buildSpaceInfoUpdatePayload(
    { spaceName: '  新名字  ', description: '   ', loveDate: '2024-05-20', loveTime: '19:30' },
    baseline,
  )
  assert.deepEqual(Object.keys(payload).sort(), ['description', 'loveStartTime', 'spaceName'])
  assert.equal(payload.spaceName, '新名字')
  // 空白简介 trim 成空串提交（用于清空简介），不是 null / undefined
  assert.equal(payload.description, '')
  // 时间未变化：保留原秒
  assert.equal(payload.loveStartTime, '2024-05-20 19:30:47')
  // 空名称提交空串（后端落回默认名「我们的故事」）
  assert.equal(
    buildSpaceInfoUpdatePayload({ spaceName: '   ', description: 'd', loveDate: '', loveTime: '' }, baseline)
      .spaceName,
    '',
  )
})

test('buildSpaceInfoUpdatePayload 绝不产生空字符串时间', () => {
  const cases = [
    { loveDate: '', loveTime: '' },
    { loveDate: '2024-05-20', loveTime: '' },
    { loveDate: '', loveTime: '19:30' },
    { loveDate: 'bad', loveTime: '19:30' },
  ]
  cases.forEach((draft) => {
    const payload = buildSpaceInfoUpdatePayload(
      { spaceName: 'n', description: 'd', ...draft },
      buildSpaceInfoBaseline(WAITING_SPACE),
    )
    assert.ok(
      payload.loveStartTime === null || typeof payload.loveStartTime === 'string',
      JSON.stringify(payload),
    )
    assert.notEqual(payload.loveStartTime, '', `时间不能是空字符串：${JSON.stringify(draft)}`)
  })
})

// ============================ 草稿比较 ============================

test('isSpaceInfoDirty：空字符串与 null 等价，时间按秒归一比较', () => {
  const baseline = buildSpaceInfoBaseline(WAITING_SPACE)
  const cleanDraft = buildSpaceInfoDraft(baseline)
  assert.equal(isSpaceInfoDirty(cleanDraft, baseline), false)

  // 名称 / 简介仅空白差异不算修改
  assert.equal(isSpaceInfoDirty({ ...cleanDraft, spaceName: '  我们的故事 ' }, baseline), false)
  assert.equal(isSpaceInfoDirty({ ...cleanDraft, description: ' 从这里开始 ' }, baseline), false)

  // 名称真的变了
  assert.equal(isSpaceInfoDirty({ ...cleanDraft, spaceName: '新名字' }, baseline), true)
  // 简介被清空
  assert.equal(isSpaceInfoDirty({ ...cleanDraft, description: '' }, baseline), true)
  // 时间被清空
  assert.equal(isSpaceInfoDirty({ ...cleanDraft, loveDate: '', loveTime: '' }, baseline), true)
  // 时间未变化
  assert.equal(isSpaceInfoDirty({ ...cleanDraft, loveDate: '2024-05-20', loveTime: '19:30' }, baseline), false)
})

test('isSpaceInfoDirty：基线无时间时草稿也没时间不算修改', () => {
  const baseline = buildSpaceInfoBaseline({ ...WAITING_SPACE, loveStartTime: null })
  const draft = buildSpaceInfoDraft(baseline)
  assert.deepEqual(draft, { spaceName: '我们的故事', description: '从这里开始', loveDate: '', loveTime: '' })
  assert.equal(isSpaceInfoDirty(draft, baseline), false)
  assert.equal(isSpaceInfoDirty({ ...draft, loveDate: '2024-05-20', loveTime: '10:00' }, baseline), true)
})

// ============================ 基线 / 摘要 ============================

test('buildSpaceInfoBaseline / describeSpaceInfo 归一化服务端数据', () => {
  const baseline = buildSpaceInfoBaseline(WAITING_SPACE)
  assert.deepEqual(baseline, {
    spaceId: 101,
    spaceName: '我们的故事',
    description: '从这里开始',
    loveStartTime: '2024-05-20 19:30:47',
  })
  const summary = describeSpaceInfo(WAITING_SPACE)
  assert.equal(summary.spaceName, '我们的故事')
  assert.equal(summary.description, '从这里开始')
  assert.equal(summary.loveStartTimeText, '2024-05-20 19:30')

  // 空 / 非法空间数据按空值处理，不抛错
  assert.deepEqual(buildSpaceInfoBaseline(null), {
    spaceId: '', spaceName: '', description: '', loveStartTime: '',
  })
  const emptySummary = describeSpaceInfo({ spaceId: 1, description: null, loveStartTime: null })
  assert.equal(emptySummary.description, '')
  assert.equal(emptySummary.loveStartTimeText, '')
})

// ============================ 校验 ============================

test('名称 30 字、简介 500 字边界：恰好等于上限通过，超出 1 字报明确错误', () => {
  const exact = '名'.repeat(SPACE_INFO_NAME_MAX)
  assert.equal(buildSpaceInfoValidationError({ spaceName: exact, description: 'd' }), '')
  const tooLong = '名'.repeat(SPACE_INFO_NAME_MAX + 1)
  assert.match(buildSpaceInfoValidationError({ spaceName: tooLong, description: 'd' }), /空间名称不能超过 30/)

  const descExact = '简'.repeat(SPACE_INFO_DESCRIPTION_MAX)
  assert.equal(buildSpaceInfoValidationError({ spaceName: 'n', description: descExact }), '')
  const descTooLong = '简'.repeat(SPACE_INFO_DESCRIPTION_MAX + 1)
  assert.match(buildSpaceInfoValidationError({ spaceName: 'n', description: descTooLong }), /空间简介不能超过 500/)
  // trim 后计算长度
  assert.equal(
    buildSpaceInfoValidationError({ spaceName: ` ${exact} `, description: 'd' }),
    '',
    '首尾空白不计入长度',
  )
})

test('只选日期或只选时间时校验不通过（避免提交半个时间）', () => {
  assert.match(
    buildSpaceInfoValidationError({ spaceName: 'n', description: '', loveDate: '2024-05-20', loveTime: '' }),
    /同时选择|日期和时间/,
  )
  assert.match(
    buildSpaceInfoValidationError({ spaceName: 'n', description: '', loveDate: '', loveTime: '19:30' }),
    /同时选择|日期和时间/,
  )
  assert.equal(
    buildSpaceInfoValidationError({ spaceName: 'n', description: '', loveDate: '2024-05-20', loveTime: '19:30' }),
    '',
  )
  assert.equal(buildSpaceInfoValidationError({ spaceName: 'n', description: '', loveDate: '', loveTime: '' }), '')
})

test('measureText 与后端 @Size 的字符数语义一致（空值为 0）', () => {
  assert.equal(measureText(null), 0)
  assert.equal(measureText(undefined), 0)
  assert.equal(measureText('abc'), 3)
  assert.equal(measureText('名'.repeat(30)), 30)
})

// ============================ 可编辑规则 ============================

test('canEditSpaceInfo：只有等待绑定且有效成员不足 2 人时可编辑', () => {
  assert.equal(canEditSpaceInfo(WAITING_SPACE), true)
  // 另一半已加入（status=1 / memberCount=2）
  assert.equal(canEditSpaceInfo({ ...WAITING_SPACE, status: 1, memberCount: 2 }), false)
  // status=0 但成员数已到 2（并发加入瞬间）
  assert.equal(canEditSpaceInfo({ ...WAITING_SPACE, memberCount: 2 }), false)
  // 已解绑 / 已销毁 / 无空间
  assert.equal(canEditSpaceInfo({ ...WAITING_SPACE, status: 5 }), false)
  assert.equal(canEditSpaceInfo({ ...WAITING_SPACE, status: 6 }), false)
  assert.equal(canEditSpaceInfo(null), false)
  assert.equal(canEditSpaceInfo({}), false)
})

test('isSpaceInfoUpdateConflict：20064 / 20034 / 20058 / 20103 视为关系已变化', () => {
  assert.equal(isSpaceInfoUpdateConflict({ errorCode: '20064' }), true)
  assert.equal(isSpaceInfoUpdateConflict({ errorCode: '20034' }), true)
  assert.equal(isSpaceInfoUpdateConflict({ errorCode: '20058' }), true)
  assert.equal(isSpaceInfoUpdateConflict({ errorCode: '20103' }), true)
  // 普通失败不触发强制刷新
  assert.equal(isSpaceInfoUpdateConflict({ errorCode: '' }), false)
  assert.equal(isSpaceInfoUpdateConflict({ statusCode: 500 }), false)
  assert.equal(isSpaceInfoUpdateConflict(null), false)
})

test('buildSpaceInfoErrorMessage：业务错误码给出可理解文案，其余回退服务端 message', () => {
  assert.match(buildSpaceInfoErrorMessage({ errorCode: '20064' }), /另一半已经加入/)
  assert.match(buildSpaceInfoErrorMessage({ errorCode: '20034' }), /不是这个空间的成员/)
  assert.match(buildSpaceInfoErrorMessage({ errorCode: '20058' }), /解绑/)
  assert.equal(buildSpaceInfoErrorMessage({ errorCode: '', message: '服务异常' }), '服务异常')
  assert.equal(buildSpaceInfoErrorMessage(null), '空间信息保存失败，请稍后重试')
  assert.equal(buildSpaceInfoErrorMessage(null, '自定义兜底'), '自定义兜底')
})
