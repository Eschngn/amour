<template>
  <CouplePageScaffold>
    <main class="page-container">
      <nav class="mb-5 flex flex-wrap items-center gap-2 text-xs text-stone-500" aria-label="当前位置">
        <RouterLink
          to="/plaza"
          class="inline-flex items-center gap-1.5 font-semibold text-stone-600 transition hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2"
        >
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M19 12H5m5 5-5-5 5-5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          恋爱广场
        </RouterLink>
        <span class="text-stone-300" aria-hidden="true">/</span>
        <span class="font-semibold text-stone-800" aria-current="page">情侣空间</span>
        <RouterLink to="/" class="ml-auto font-semibold text-stone-600 transition hover:text-rose-700">
          {{ homeLinkLabel }}
        </RouterLink>
      </nav>

      <FrontendPageHeader
        eyebrow="情侣空间"
        :title="pageHeading"
        :description="pageDescription"
        heading-id="space-setup-heading"
      />

        <!-- 未登录：保留邀请 token 并允许预览，登录后回跳仍带着它 -->
        <section v-if="!frontendLoggedIn" class="panel mt-6">
          <div class="grid lg:grid-cols-2">
            <div class="border-b border-stone-100 px-5 py-8 sm:px-6 lg:border-b-0 lg:border-r">
              <h2 class="font-display text-xl font-bold text-stone-900">登录后才能创建或绑定情侣空间</h2>
              <p class="mt-2 text-sm leading-6 text-stone-500">
                <template v-if="guestInvitationToken">你的邀请链接已保留，登录后会自动回到这个邀请。</template>
                <template v-else>登录后可以创建新的空间，也可以接受另一半的邀请。</template>
              </p>
              <RouterLink :to="loginWithRedirect" class="btn-primary mt-5">
                去登录
              </RouterLink>
            </div>

            <div class="px-5 py-8 sm:px-6">
              <label for="setup-guest-token" class="field-label">已有邀请链接</label>
              <textarea
                id="setup-guest-token"
                v-model="inviteToken"
                rows="2"
                maxlength="500"
                class="field-input resize-y leading-6"
                placeholder="粘贴另一半发来的邀请链接"
              />
              <div class="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p class="field-hint !mt-0">未登录也可以先预览邀请内容</p>
                <button type="button" class="btn-primary" :disabled="previewing" @click="loadInvitationPreview">
                  {{ previewing ? '预览中…' : '预览邀请' }}
                </button>
              </div>
              <p v-if="previewError" class="mt-3 rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs leading-5 text-rose-700" role="alert">
                {{ previewError }}
              </p>

              <div v-if="preview" class="mt-4 rounded-xl border border-stone-200 bg-stone-50/60 p-4">
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">邀请预览</p>
                    <h3 class="mt-1 break-words font-display text-lg font-bold text-stone-900">{{ preview.spaceName || '情侣空间' }}</h3>
                    <p class="mt-1 text-xs text-stone-500">
                      来自 {{ preview.inviterName || '恋人' }}
                      <span v-if="preview.inviterAmourId"> · ID {{ preview.inviterAmourId }}</span>
                    </p>
                  </div>
                  <span class="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold" :class="previewStatusClass">
                    {{ preview.statusText || '未知状态' }}
                  </span>
                </div>
                <p v-if="preview.description" class="mt-3 whitespace-pre-line break-words text-xs leading-6 text-stone-600">{{ preview.description }}</p>
                <dl class="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-stone-200 bg-stone-200 text-xs">
                  <div class="bg-white px-3 py-2">
                    <dt class="text-[10px] text-stone-400">空间成员</dt>
                    <dd class="mt-0.5 font-semibold text-stone-900">{{ preview.memberCount || 0 }} / {{ preview.memberLimit || 2 }}</dd>
                  </div>
                  <div class="bg-white px-3 py-2">
                    <dt class="text-[10px] text-stone-400">有效期</dt>
                    <dd class="mt-0.5 text-[11px] font-semibold leading-5 text-stone-900">{{ formatInvitationExpiry(preview.expiresAt) }}</dd>
                  </div>
                </dl>
                <p class="mt-3 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs leading-5 text-amber-800" role="status">
                  登录后即可接受该邀请。
                </p>
                <RouterLink :to="loginWithRedirect" class="btn-primary mt-3">
                  登录后接受邀请
                </RouterLink>
              </div>
            </div>
          </div>
        </section>

        <div v-else-if="statusLoading" class="panel mt-6 px-5 py-6" aria-label="正在读取情侣空间状态" aria-busy="true">
          <div class="h-5 w-28 animate-pulse rounded bg-stone-100" />
          <div class="mt-4 h-8 w-2/3 max-w-md animate-pulse rounded bg-stone-100" />
          <div class="mt-8 grid gap-4 sm:grid-cols-2">
            <div class="h-44 animate-pulse rounded-xl bg-stone-50" />
            <div class="h-44 animate-pulse rounded-xl bg-stone-50" />
          </div>
        </div>

        <section v-else-if="statusError" class="panel mt-6 px-6 py-12 text-center" role="alert">
          <h2 class="font-display text-xl font-bold text-stone-900">暂时无法确认你的空间状态</h2>
          <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">{{ spaceError }}</p>
          <p class="mt-2 text-xs text-stone-400">这不代表你没有情侣空间，可能只是网络或服务暂时不可用。</p>
          <div class="mt-5 flex flex-wrap justify-center gap-2">
            <button type="button" class="btn-primary" @click="retryStatus">重新读取状态</button>
            <RouterLink to="/plaza" class="btn-secondary">返回恋爱广场</RouterLink>
          </div>
        </section>

        <!--
          已登录且已拿到空间状态：统一渲染空间概览与设置面板。
          status=0 时邀请区通过 after-overview 插槽放在概览下方。
        -->
        <SpaceSettingsPanel v-else-if="showSpacePanel" class="mt-6">
          <template #after-overview>
            <!--
              status=0 的创建者必须能在这里发出邀请。
              这段不能放进 create/bind 分支：hasCoupleSpace 为 true 时整块表单都会被跳过。
            -->
            <section
              v-if="isSpaceWaiting"
              id="space-invite-partner"
              class="panel scroll-mt-24"
              aria-labelledby="space-invite-heading"
            >
              <header class="panel-header">
                <div class="min-w-0">
                  <p class="section-kicker">邀请另一半</p>
                  <h2 id="space-invite-heading" class="mt-1 section-title">邀请另一半加入</h2>
                  <p class="mt-1 max-w-2xl text-xs leading-6 text-stone-500">
                    生成一条邀请链接发给 Ta。链接有效期 7 天，对方接受后空间会自动变成正常状态。
                  </p>
                </div>
                <button
                  type="button"
                  class="btn-secondary !py-1.5"
                  :disabled="pendingInvitationsLoading"
                  @click="refreshPendingInvitations"
                >
                  {{ pendingInvitationsLoading ? '刷新中…' : '刷新待发邀请' }}
                </button>
              </header>

              <div class="grid gap-6 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-8">
                <div class="min-w-0">
                  <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <p class="text-xs font-semibold text-stone-600">生成邀请</p>
                    <RouterLink to="/space/studio" class="btn-ghost !px-2 !py-1 !text-[11px]">
                      先布置空间
                      <span aria-hidden="true">→</span>
                    </RouterLink>
                  </div>

                  <!-- 空间已满（memberCount=2 但状态还没来得及刷新）时不再提供创建入口 -->
                  <div v-if="!canManageSpaceInvitations" class="rounded-lg border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-xs leading-5 text-amber-800" role="status">
                    当前空间已有两名成员，不能再创建新的邀请。如果状态没有及时更新，请点击上方「刷新空间状态」。
                  </div>

                  <form v-else class="space-y-3" @submit.prevent="createInviteLink">
                    <div>
                      <label for="setup-invitee-amour-id" class="field-label">
                        指定恋语 ID <span class="text-xs font-normal text-stone-400">（选填）</span>
                      </label>
                      <input
                        id="setup-invitee-amour-id"
                        v-model="inviteForm.inviteeAmourId"
                        :maxlength="INVITEE_AMOUR_ID_MAX_LENGTH"
                        class="field-input"
                        placeholder="例如 LY100002，留空则生成通用链接邀请"
                        autocomplete="off"
                        @input="inviteFormError = ''"
                      >
                      <p class="field-hint">
                        填写后只有该账号能接受；留空则拿到链接的人都能接受。
                      </p>
                    </div>

                    <p v-if="inviteFormError" class="rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs leading-5 text-rose-700" role="alert">
                      {{ inviteFormError }}
                    </p>

                    <div class="flex flex-wrap items-center gap-2">
                      <button type="submit" class="btn-primary" :disabled="creatingInvitation">
                        <span v-if="creatingInvitation" class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                        {{ creatingInvitation ? '正在生成…' : (inviteForm.inviteeAmourId.trim() ? '生成定向邀请' : '生成邀请链接') }}
                      </button>
                      <span class="text-[11px] text-stone-400">生成新链接后，之前的邀请链接会立即失效</span>
                    </div>
                  </form>

                  <!-- 当次创建结果：生成后也会出现在待接受邀请中，可随时再次复制 -->
                  <div v-if="createdInvitation" class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                    <div class="flex flex-wrap items-start justify-between gap-2">
                      <div class="min-w-0">
                        <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600">邀请已生成</p>
                        <h3 class="mt-1 font-display text-base font-bold text-stone-900">
                          {{ createdInvitation.inviteeAmourId ? '定向邀请已生成' : '邀请链接已生成' }}
                        </h3>
                        <p class="mt-1 text-[11px] leading-5 text-stone-500">
                          <span v-if="createdInvitation.inviteeAmourId">指定账号 · {{ createdInvitation.inviteeAmourId }} · </span>
                          生成时间 {{ formatSpaceDateTime(createdInvitation.createdAt) }}
                        </p>
                        <p class="text-[11px] leading-5 text-stone-500">有效期至 {{ formatInvitationExpiry(createdInvitation.expiresAt) }}</p>
                      </div>
                      <button
                        type="button"
                        class="shrink-0 rounded px-2 py-1 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                        @click="dismissCreatedInvitation"
                      >
                        收起
                      </button>
                    </div>

                    <div class="mt-3">
                      <label for="created-invite-link" class="text-[11px] font-semibold text-stone-600">邀请链接</label>
                      <div class="mt-1.5 flex flex-col gap-2 sm:flex-row">
                        <input
                          id="created-invite-link"
                          :value="createdInvitation.link"
                          readonly
                          class="field-input !mt-0 w-full flex-1 font-mono text-[11px]"
                          @focus="$event.target.select()"
                        >
                        <button
                          type="button"
                          class="btn-primary shrink-0"
                          :disabled="copyingLinkKey === 'created'"
                          @click="copyInvitationLink(createdInvitation.link, 'created')"
                        >
                          {{ copyingLinkKey === 'created' ? '复制中…' : '复制链接' }}
                        </button>
                      </div>

                      <p v-if="copyError" class="mt-3 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-[11px] leading-5 text-amber-800" role="alert">
                        {{ copyError }} 可以直接选中上面的输入框内容手动复制。
                      </p>
                      <p v-else-if="copyHint" class="mt-3 rounded-lg border border-emerald-200/80 bg-emerald-50/70 px-3 py-2 text-[11px] leading-5 text-emerald-700" role="status">
                        {{ copyHint }}
                      </p>
                    </div>
                  </div>
                </div>

                <!-- 已发出的待接受邀请：浏览、复制与撤销 -->
                <div class="min-w-0 border-t border-stone-100 pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <h3 class="text-sm font-semibold text-stone-900">待接受的邀请</h3>
                    <span class="text-[11px] text-stone-400">共 {{ pendingInvitations.length }} 条</span>
                  </div>

                  <p v-if="pendingInvitationsError" class="mt-3 rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs leading-5 text-rose-700" role="alert">
                    {{ pendingInvitationsError }}
                  </p>

                  <div v-if="pendingInvitationsLoading" class="mt-3 space-y-2" aria-label="正在加载待发邀请" aria-busy="true">
                    <div v-for="n in 2" :key="n" class="h-20 animate-pulse rounded-lg bg-stone-100" />
                  </div>
                  <div v-else-if="!pendingInvitations.length" class="studio-empty mt-3">
                    <p class="text-sm font-semibold text-stone-800">还没有待接受的邀请</p>
                    <p class="mt-1 text-xs text-stone-500">生成邀请链接后，可在这里随时复制并查看有效期。</p>
                  </div>
                  <div v-else class="mt-2 divide-y divide-stone-100">
                    <article v-for="invitation in pendingInvitations" :key="invitation.invitationId" class="py-3">
                      <div class="flex flex-wrap items-start justify-between gap-3">
                        <div class="min-w-0">
                          <p class="flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
                            <span class="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-stone-600">
                              {{ invitation.isTargeted ? '定向邀请' : '链接邀请' }}
                            </span>
                            <span v-if="invitation.isTargeted" class="font-semibold text-stone-800">ID {{ invitation.inviteeAmourId }}</span>
                            <span v-else>任何持有链接的账号均可接受</span>
                          </p>
                          <p class="mt-1 break-words text-[11px] leading-5 text-stone-500">
                            {{ invitation.statusText || '待接受' }} · {{ formatInvitationExpiry(invitation.expiresAt) }}
                          </p>
                          <p class="mt-0.5 text-[11px] text-stone-400">
                            创建于 {{ formatSpaceDateTime(invitation.createTime) }}
                          </p>
                        </div>
                        <button
                          type="button"
                          class="btn-ghost shrink-0 !px-2 !py-1 !text-[11px]"
                          :disabled="revokingInvitationId === invitation.invitationId"
                          @click="revokeInvitation(invitation)"
                        >
                          {{ revokingInvitationId === invitation.invitationId ? '正在撤销…' : '撤销邀请' }}
                        </button>
                      </div>

                      <div v-if="invitation.canCopy" class="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          :value="invitation.link"
                          readonly
                          class="field-input !mt-0 w-full flex-1 font-mono text-[11px]"
                          @focus="$event.target.select()"
                        >
                        <button
                          type="button"
                          class="btn-secondary shrink-0 !py-2"
                          :disabled="copyingLinkKey === invitation.invitationId"
                          @click="copyInvitationLink(invitation.link, invitation.invitationId)"
                        >
                          {{ copyingLinkKey === invitation.invitationId ? '复制中…' : '复制链接' }}
                        </button>
                      </div>
                      <p v-else class="mt-2 text-[11px] leading-5 text-amber-700/80">
                        该邀请生成于旧版本，无法再次查看链接，请重新生成。
                      </p>
                    </article>
                  </div>
                </div>
              </div>
            </section>
            <p
              v-if="incomingInvitationToken && !isSpaceWaiting"
              class="rounded-xl border border-amber-200/80 bg-amber-50/80 px-3.5 py-2.5 text-xs leading-5 text-amber-800"
              role="status"
            >
              你正在查看一条邀请链接，但你已经加入了情侣空间，无法再加入另一个空间。
            </p>
          </template>
        </SpaceSettingsPanel>

        <!-- 没有有效空间或 status=5 已完成解绑时，展示创建/绑定入口。 -->
        <template v-else>
          <div class="mt-6 grid items-start gap-6 lg:grid-cols-2">
            <section
              id="space-create"
              class="panel scroll-mt-24"
              :class="action === 'create' ? 'border-rose-300 ring-2 ring-rose-100' : ''"
              aria-labelledby="space-create-heading"
            >
              <div class="px-5 py-5 sm:px-6">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="section-kicker">01 · 创建</p>
                    <h2 id="space-create-heading" class="mt-1 font-display text-xl font-bold text-stone-900">创建情侣空间</h2>
                    <p class="mt-1 text-xs leading-6 text-stone-500">创建后，空间会先等待另一半加入。</p>
                  </div>
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-base text-rose-500" aria-hidden="true">✦</span>
                </div>

                <form class="mt-5 space-y-4" @submit.prevent="createSpace">
                  <div>
                    <label for="setup-space-name" class="field-label">空间名称</label>
                    <input
                      id="setup-space-name"
                      v-model="createForm.spaceName"
                      maxlength="30"
                      class="field-input"
                      placeholder="我们的故事"
                    >
                    <p class="field-hint">不填写时默认为「我们的故事」，最多 30 个字符</p>
                  </div>
                  <div>
                    <label for="setup-love-start" class="field-label">恋爱开始时间</label>
                    <div class="love-start-picker mt-2">
                      <VueDatePicker
                        v-model="createForm.loveStartTime"
                        :locale="datePickerLocale"
                        :formats="datePickerFormats"
                        :time-config="datePickerTimeConfig"
                        :action-row="datePickerActionRow"
                        :input-attrs="{ id: 'setup-love-start', clearable: true }"
                        :max-date="now"
                        :dark="false"
                        :teleport="false"
                        placeholder="选择你们在一起的那一天"
                        model-type="format"
                      >
                        <template #input-icon>
                          <span class="love-start-picker__icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
                              <rect x="3.5" y="5" width="17" height="15.5" rx="3.2" />
                              <path d="M8 3.2v3.4M16 3.2v3.4M3.5 10h17" stroke-linecap="round" />
                              <path d="M12 17.2c-2.4-1.5-3.6-2.6-3.6-4a1.9 1.9 0 0 1 3.6-.9 1.9 1.9 0 0 1 3.6.9c0 1.4-1.2 2.5-3.6 4Z" fill="currentColor" stroke="none" />
                            </svg>
                          </span>
                        </template>
                      </VueDatePicker>
                    </div>
                    <p class="field-hint">选填，用于计算你们相伴的天数</p>
                  </div>
                  <div>
                    <label for="setup-description" class="field-label">空间简介</label>
                    <textarea
                      id="setup-description"
                      v-model="createForm.description"
                      rows="3"
                      maxlength="500"
                      class="field-input resize-y leading-7"
                      placeholder="写下这个空间想收藏的东西……"
                    />
                    <p class="field-hint text-right">{{ createForm.description.length }} / 500</p>
                  </div>
                  <p v-if="createError" class="rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs leading-5 text-rose-700" role="alert">
                    {{ createError }}
                  </p>
                  <button type="submit" class="btn-primary w-full !py-3 !text-sm" :disabled="creating">
                    <span v-if="creating" class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                    {{ creating ? '正在创建…' : '创建情侣空间' }}
                  </button>
                </form>
              </div>
            </section>

            <section
              id="space-bind"
              class="panel scroll-mt-24"
              :class="action === 'bind' ? 'border-rose-300 ring-2 ring-rose-100' : ''"
              aria-labelledby="space-bind-heading"
            >
              <div class="px-5 py-5 sm:px-6">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="section-kicker">02 · 加入</p>
                    <h2 id="space-bind-heading" class="mt-1 font-display text-xl font-bold text-stone-900">绑定情侣空间</h2>
                    <p class="mt-1 text-xs leading-6 text-stone-500">粘贴邀请链接后，先预览，再确认加入。</p>
                  </div>
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-base text-amber-500" aria-hidden="true">♡</span>
                </div>

                <div class="mt-5">
                  <label for="setup-invite-token" class="field-label">邀请链接</label>
                  <textarea
                    id="setup-invite-token"
                    v-model="inviteToken"
                    rows="3"
                    maxlength="500"
                    class="field-input resize-y leading-6"
                    placeholder="粘贴另一半发来的邀请链接"
                  />
                  <div class="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p class="field-hint !mt-0">粘贴完整邀请链接即可预览</p>
                    <button type="button" class="btn-primary" :disabled="previewing" @click="loadInvitationPreview">
                      {{ previewing ? '预览中…' : '预览邀请' }}
                    </button>
                  </div>
                  <p v-if="previewError" class="mt-3 rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs leading-5 text-rose-700" role="alert">
                    {{ previewError }}
                  </p>

                  <div v-if="preview" class="mt-4 rounded-xl border border-stone-200 bg-stone-50/60 p-4">
                    <div class="flex flex-wrap items-start justify-between gap-2">
                      <div class="min-w-0">
                        <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">邀请预览</p>
                        <h3 class="mt-1 break-words font-display text-lg font-bold text-stone-900">{{ preview.spaceName || '情侣空间' }}</h3>
                        <p class="mt-1 text-xs text-stone-500">
                          来自 {{ preview.inviterName || '恋人' }}
                          <span v-if="preview.inviterAmourId"> · ID {{ preview.inviterAmourId }}</span>
                        </p>
                      </div>
                      <span class="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold" :class="previewStatusClass">
                        {{ preview.statusText || '未知状态' }}
                      </span>
                    </div>
                    <p v-if="preview.description" class="mt-3 whitespace-pre-line break-words text-xs leading-6 text-stone-600">{{ preview.description }}</p>
                    <dl class="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-stone-200 bg-stone-200 text-xs">
                    <div class="bg-white px-3 py-2">
                      <dt class="text-[10px] text-stone-400">空间成员</dt>
                      <dd class="mt-0.5 font-semibold text-stone-900">{{ preview.memberCount || 0 }} / {{ preview.memberLimit || 2 }}</dd>
                    </div>
                    <div class="bg-white px-3 py-2">
                      <dt class="text-[10px] text-stone-400">有效期</dt>
                      <dd class="mt-0.5 text-[11px] font-semibold leading-5 text-stone-900">{{ formatInvitationExpiry(preview.expiresAt) }}</dd>
                    </div>
                    <div class="bg-white px-3 py-2">
                      <dt class="text-[10px] text-stone-400">邀请类型</dt>
                      <dd class="mt-0.5 font-semibold text-stone-900">{{ preview.inviteeRestricted ? '指定账号' : '链接邀请' }}</dd>
                    </div>
                    <div class="bg-white px-3 py-2">
                      <dt class="text-[10px] text-stone-400">可加入</dt>
                      <dd class="mt-0.5 font-semibold" :class="preview.joinable ? 'text-emerald-700' : 'text-rose-600'">
                        {{ preview.joinable ? '是' : '否' }}
                      </dd>
                    </div>
                  </dl>
                  <p v-if="preview.inviteeRestricted && preview.inviteeMatched === false" class="mt-3 rounded-lg border border-rose-200/80 bg-rose-50/80 px-3 py-2 text-xs leading-5 text-rose-700" role="status">
                    这是一条定向邀请，指定的不是当前登录账号。
                  </p>
                  <p v-if="previewBlockMessage" class="mt-3 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs leading-5 text-amber-800" role="status">
                    {{ previewBlockMessage }}
                  </p>
                  <p v-if="acceptError" class="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700" role="alert">
                    {{ acceptError }}
                  </p>
                  <div class="mt-4 flex flex-wrap gap-2">
                    <button
                      v-if="previewAction === 'accept'"
                      type="button"
                      class="btn-primary"
                      :disabled="acceptingToken"
                      @click="acceptPreviewInvitation"
                    >
                      <span v-if="acceptingToken" class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                      {{ acceptingToken ? '正在加入…' : '接受邀请并加入' }}
                    </button>
                    <RouterLink
                      v-else-if="previewAction === 'login'"
                      :to="loginWithRedirect"
                      class="btn-primary"
                    >
                      登录后接受邀请
                    </RouterLink>
                    <RouterLink
                      v-if="previewAction === 'space'"
                      to="/"
                      class="btn-secondary"
                    >
                      返回我的情侣空间
                    </RouterLink>
                    <RouterLink
                      v-else-if="previewAction === 'plaza'"
                      to="/plaza"
                      class="btn-secondary"
                    >
                      返回恋爱广场
                    </RouterLink>
                  </div>
                </div>
              </div>
            </div>
            </section>
          </div>

          <section class="panel mt-6" aria-labelledby="received-invitations-heading">
            <header class="panel-header">
              <div class="min-w-0">
                <h2 id="received-invitations-heading" class="section-title">收到的邀请</h2>
              </div>
              <button type="button" class="btn-secondary !py-1.5" :disabled="invitationsLoading" @click="refreshReceivedInvitations">
                {{ invitationsLoading ? '刷新中…' : '刷新列表' }}
              </button>
            </header>

            <div class="px-5 py-5 sm:px-6">
            <p v-if="invitationActionError" class="mb-4 rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-2 text-xs leading-5 text-rose-700" role="alert">
              {{ invitationActionError }}
            </p>

            <div v-if="invitationsLoading" class="grid gap-3 sm:grid-cols-2" aria-label="正在加载收到的邀请" aria-busy="true">
              <div v-for="n in 2" :key="n" class="h-24 animate-pulse rounded-lg bg-stone-100" />
            </div>
            <div v-else-if="invitationsError" class="studio-empty">
              <p class="text-xs leading-5 text-stone-600">{{ invitationsError }}</p>
              <button type="button" class="btn-secondary mt-3" @click="refreshReceivedInvitations">
                重新加载
              </button>
            </div>
            <div v-else-if="!invitations.length" class="studio-empty">
              <p class="text-sm font-semibold text-stone-800">暂时没有收到邀请</p>
              <p class="mt-1 text-xs text-stone-500">当另一半向你发出邀请后，会出现在这里。</p>
            </div>
            <div v-else class="divide-y divide-stone-100">
              <article v-for="invitation in invitations" :key="invitation.invitationId" class="py-4">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-xs text-stone-500">
                      <span class="font-semibold text-stone-800">{{ invitation.inviterName || 'Ta' }}</span>
                      邀请你加入
                    </p>
                    <h3 class="mt-1 break-words font-display text-base font-bold text-stone-900">{{ invitation.spaceName || '情侣空间' }}</h3>
                    <p class="mt-1 text-[11px] text-stone-400">
                      {{ formatInvitationExpiry(invitation.expiresAt) }}
                      <span v-if="invitation.inviterAmourId"> · ID {{ invitation.inviterAmourId }}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    class="btn-primary shrink-0"
                    :disabled="acceptingInvitationId === invitation.invitationId"
                    @click="acceptReceivedInvitation(invitation)"
                  >
                    {{ acceptingInvitationId === invitation.invitationId ? '正在加入…' : '接受邀请' }}
                  </button>
                </div>
              </article>
            </div>
            </div>
          </section>
        </template>
    </main>
  </CouplePageScaffold>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import 'element-plus/es/components/message/style/css'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import { zhCN } from 'date-fns/locale'
import CouplePageScaffold from '@/components/frontend/CouplePageScaffold.vue'
import FrontendPageHeader from '@/components/frontend/FrontendPageHeader.vue'
import SpaceSettingsPanel from '@/components/frontend/SpaceSettingsPanel.vue'
import { frontendLoggedIn } from '@/utils/auth'
import {
  acceptSpaceInvitation,
  createCoupleSpace,
  createSpaceInvitation,
  fetchReceivedSpaceInvitations,
  fetchSpaceInvitations,
  previewSpaceInvitation,
  revokeSpaceInvitation,
} from '@/api/space'
import { useFrontendSpace } from '@/composables/useFrontendSpace'
import { formatInvitationExpiry, formatSpaceDateTime } from '@/utils/spaceFormat'
import {
  INVITEE_AMOUR_ID_MAX_LENGTH,
  buildInvitationLink,
  canAcceptInvitation,
  describeInvitationBlock,
  extractInvitationToken,
  normalizeInvitationList,
  resolveInvitationAction,
  validateInviteeAmourId,
} from '@/utils/spaceInvitation'
import { resolveSafeRedirect } from '@/utils/safeRedirect'
import { isUnboundSpace, readSpaceErrorMessage } from '@/utils/spaceState'

const route = useRoute()
const router = useRouter()
const {
  spaceStatus,
  spaceLoading,
  spaceError,
  hasCoupleSpace,
  isSpaceReady,
  isSpaceWaiting,
  canManageSpaceInvitations,
  refreshSpaceStatus,
} = useFrontendSpace()

/** 有未解绑的空间时，页面统一展示空间概览与设置面板。 */
const showSpacePanel = computed(() => (
  hasCoupleSpace.value && !isUnboundSpace(spaceStatus.value)
))
const pageHeading = computed(() => {
  if (showSpacePanel.value) return '空间设置'
  if (statusError.value) return '情侣空间'
  return '创建或绑定你们的情侣空间'
})
const pageDescription = computed(() => {
  if (statusError.value) {
    return '空间状态暂时无法读取，请重新读取或返回恋爱广场。'
  }
  return ''
})
const homeLinkLabel = computed(() => (
  isSpaceReady.value ? '返回我的情侣空间' : '回到首页'
))

const createForm = reactive({
  spaceName: '',
  description: '',
  // 由 VueDatePicker 以 yyyy-MM-dd HH:mm 字符串维护，提交时再补秒。
  loveStartTime: '',
})
const creating = ref(false)
const createError = ref('')

/** 中文日历：月份、星期与操作栏文案跟随站点语言。 */
const datePickerLocale = zhCN
/** input 决定输入框与 v-model 的字符串格式，提交时再补秒。 */
const datePickerFormats = {
  month: 'M 月',
  year: 'yyyy 年',
  weekDay: 'EEEEE',
  input: 'yyyy-MM-dd HH:mm',
  preview: 'yyyy 年 M 月 d 日 HH:mm',
}
const datePickerActionRow = {
  showNow: true,
  showSelect: true,
  selectBtnLabel: '确定',
  cancelBtnLabel: '取消',
  nowBtnLabel: '此刻',
}
/** 日期 + 24 小时制时间，分钟按 5 分钟步进。 */
const datePickerTimeConfig = {
  enableTimePicker: true,
  is24: true,
  enableSeconds: false,
  minutesGridIncrement: 5,
}
/** 恋爱开始时间不能选未来。 */
const now = new Date()

const inviteToken = ref('')
const preview = ref(null)
const previewing = ref(false)
const previewError = ref('')
const acceptingToken = ref(false)
const acceptError = ref('')
const previewToken = ref('')
/** 预览请求序号：token 变更或重新预览时递增，用于丢弃过期响应。 */
let previewSequence = 0

const invitations = ref([])
const invitationsLoading = ref(false)
const invitationsError = ref('')
const acceptingInvitationId = ref(null)
const invitationActionError = ref('')

/* -------------------- status=0：创建者管理待绑定邀请 -------------------- */

const inviteForm = reactive({ inviteeAmourId: '' })
const inviteFormError = ref('')
const creatingInvitation = ref(false)

/**
 * 当次创建邀请得到的可分享邀请链接。
 * 生成后也会出现在待接受邀请列表中，可在有效期内再次复制；链接不写入 localStorage。
 */
const createdInvitation = ref(null)
const copyingLinkKey = ref('')
const copyError = ref('')
const copyHint = ref('')

const pendingInvitations = ref([])
const pendingInvitationsLoading = ref(false)
const pendingInvitationsError = ref('')
const revokingInvitationId = ref(null)

const action = computed(() => String(route.query.action || '').toLowerCase())
const statusLoading = computed(() => spaceLoading.value && !spaceStatus.value)
const statusError = computed(() => Boolean(spaceError.value) && !spaceStatus.value)

const previewStatusClass = computed(() => {
  const status = Number(preview.value?.status)
  if (status === 0) return 'bg-amber-100 text-amber-700'
  if (status === 1) return 'bg-emerald-100 text-emerald-700'
  if (status === 3) return 'bg-rose-100 text-rose-600'
  return 'bg-slate-100 text-slate-600'
})

/** 只有登录且后端判定可加入时才能渲染“接受邀请并加入”。 */
const previewAction = computed(() => resolveInvitationAction(preview.value, frontendLoggedIn.value))

/** 不可加入时的说明：后端 message 优先，缺失时按预览字段兜底。 */
const previewBlockMessage = computed(() => {
  if (!preview.value || previewAction.value === 'accept' || previewAction.value === 'login') return ''
  return describeInvitationBlock(preview.value)
})

/**
 * URL 深链接里的邀请 token。
 *
 * 与 inviteToken 分开保存：即使用户清空输入框，只要还在这个链接上，
 * 就能提示“你正在查看一条邀请”。token 只留在内存，不写入存储。
 */
const incomingInvitationToken = computed(() => {
  const raw = route.query.token
  const value = Array.isArray(raw) ? raw[0] : raw
  return typeof value === 'string' ? value.trim() : ''
})

/** 未登录预览时把 token 带进登录回跳地址，登录后仍能回到这条邀请。 */
const guestInvitationToken = computed(() => extractInvitationToken(inviteToken.value))

/**
 * 登录回跳地址。
 *
 * 用 router.resolve 生成 href，而不是手工拼 `?token=`：
 * 这样 token 与其它查询参数都会被正确编码，& 等字符不会截断地址。
 * 生成结果仍交给 resolveSafeRedirect 再校验一次，避免开放重定向。
 */
const loginWithRedirect = computed(() => {
  const query = { ...route.query }
  // 未登录用户可能是在输入框里粘贴的 token，回跳时要带上它。
  if (guestInvitationToken.value && !query.token) {
    query.token = guestInvitationToken.value
  }
  const target = router.resolve({ path: route.path, query })
  const href = resolveSafeRedirect(target.href)
  return { path: '/login', query: { redirect: href } }
})

/** 后端需要 yyyy-MM-dd HH:mm:ss，选择器给出的是 yyyy-MM-dd HH:mm。 */
function toBackendDateTime(value) {
  const text = String(value || '').trim()
  if (!text) return null
  const normalized = text.replace('T', ' ')
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(normalized) ? `${normalized}:00` : normalized
}

function safeRedirect() {
  const raw = route.query.redirect
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//')) return '/'
  if (raw.startsWith('/admin') || raw.startsWith('/login') || raw.startsWith('/space/setup')) return '/'
  return raw
}

function scrollToAction() {
  if (action.value !== 'create' && action.value !== 'bind') return
  const target = document.getElementById(action.value === 'create' ? 'space-create' : 'space-bind')
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function loadReceivedInvitations() {
  if (invitationsLoading.value) return
  if ((hasCoupleSpace.value && !isUnboundSpace(spaceStatus.value)) || spaceError.value) return

  invitationsLoading.value = true
  invitationsError.value = ''
  try {
    const { data } = await fetchReceivedSpaceInvitations()
    if (!data?.success) {
      throw new Error(data?.message || '收到的邀请加载失败')
    }
    invitations.value = Array.isArray(data.data) ? data.data : []
    invitationsError.value = ''
  } catch (error) {
    // 网络失败时保持原列表，只提示可重试，不能显示成“没有邀请”。
    invitationsError.value = readInviteErrorMessage(error, '收到的邀请加载失败，请稍后重试')
  } finally {
    invitationsLoading.value = false
  }
}

function refreshReceivedInvitations() {
  invitationActionError.value = ''
  loadReceivedInvitations()
}

function redirectBackWhenReady() {
  if (!isSpaceReady.value || typeof route.query.redirect !== 'string') return false
  router.replace(safeRedirect())
  return true
}

async function retryStatus() {
  await refreshSpaceStatus()
  if (redirectBackWhenReady()) return
  if (isSpaceWaiting.value) {
    await loadPendingInvitations()
    return
  }
  if ((!hasCoupleSpace.value || isUnboundSpace(spaceStatus.value)) && !spaceError.value) {
    await loadReceivedInvitations()
  }
}

/* -------------------- status=0：创建、复制、撤销邀请 -------------------- */

/**
 * 用 Router 的邀请地址生成完整链接。
 *
 * token 交给 URLSearchParams 编码，避免手工拼接时出现 +、/、= 等字符导致的解析错误。
 */
function buildShareLink(token) {
  const query = new URLSearchParams({ token }).toString()
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}${router.resolve({ name: 'space-setup' }).href}?${query}`
}

/**
 * 邀请相关操作的错误文案。
 *
 * readSpaceErrorMessage 会原样返回 Axios 的英文 message（如 "Network Error"），
 * 这里把纯网络层错误换成中文提示，后端业务 message 仍然优先。
 */
function readInviteErrorMessage(error, fallback) {
  // 有 HTTP 响应时一律使用后端文案，绝不把业务失败改写成网络错误。
  const backendMessage = error?.response?.data?.message
  if (typeof backendMessage === 'string' && backendMessage.trim()) {
    return backendMessage.trim()
  }
  if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
    return '网络连接不稳定，请检查网络后重试'
  }
  if (error?.code === 'ECONNABORTED') {
    return '请求超时，请稍后重试'
  }
  return readSpaceErrorMessage(error, fallback)
}

/** 拉取当前空间的待发邀请。接口不返回令牌，只能展示状态与有效期。 */
async function loadPendingInvitations() {
  if (!isSpaceWaiting.value || pendingInvitationsLoading.value) return
  pendingInvitationsLoading.value = true
  pendingInvitationsError.value = ''
  try {
    const { data } = await fetchSpaceInvitations()
    if (!data?.success) {
      throw new Error(data?.message || '待发邀请加载失败')
    }
    pendingInvitations.value = normalizeInvitationList(data.data).map((item) => ({
      ...item,
      link: item.canCopy ? buildShareLink(item.token) : '',
    }))
  } catch (error) {
    pendingInvitationsError.value = readInviteErrorMessage(error, '待发邀请加载失败，请稍后重试')
  } finally {
    pendingInvitationsLoading.value = false
  }
}

function refreshPendingInvitations() {
  if (pendingInvitationsLoading.value) return
  loadPendingInvitations()
}

async function createInviteLink() {
  if (creatingInvitation.value || !isSpaceWaiting.value) return

  const inviteeAmourId = inviteForm.inviteeAmourId.trim()
  const validationError = validateInviteeAmourId(inviteeAmourId)
  if (validationError) {
    inviteFormError.value = validationError
    return
  }
  if (!canManageSpaceInvitations.value) {
    inviteFormError.value = '当前空间状态不允许继续创建邀请，请先刷新空间状态'
    return
  }

  creatingInvitation.value = true
  inviteFormError.value = ''
  copyError.value = ''
  copyHint.value = ''
  try {
    const { data } = await createSpaceInvitation(
      inviteeAmourId ? { inviteeAmourId } : {},
    )
    if (!data?.success) {
      // 20036=成员已满，20035=空间状态不允许；这两种情况状态已变化，刷新后重试。
      const code = String(data?.errorCode ?? '')
      if (code === '20036' || code === '20035') {
        await refreshSpaceStatus()
      }
      throw new Error(data?.message || '邀请生成失败')
    }

    const result = data.data || {}
    if (!result.token) {
      throw new Error('邀请已生成，但没有拿到可分享的邀请链接，请重试')
    }
    createdInvitation.value = {
      invitationId: result.invitationId,
      expiresAt: result.expiresAt,
      inviteeAmourId: result.inviteeAmourId ?? null,
      link: buildShareLink(result.token),
      createdAt: new Date().toISOString(),
    }
    ElMessage.success(result.inviteeAmourId ? '定向邀请已生成' : '邀请链接已生成')
    inviteForm.inviteeAmourId = ''

    // 成功后按约定刷新空间状态与待发邀请列表。
    await refreshSpaceStatus()
    await loadPendingInvitations()
  } catch (error) {
    inviteFormError.value = readInviteErrorMessage(error, '邀请生成失败，请稍后重试')
  } finally {
    creatingInvitation.value = false
  }
}

function dismissCreatedInvitation() {
  createdInvitation.value = null
  copyError.value = ''
  copyHint.value = ''
}

/**
 * 复制邀请链接。
 *
 * 剪贴板 API 只在安全上下文可用，且可能被权限策略拒绝：
 * 失败时不静默，改为提示用户手动选中输入框内容。
 */
async function copyInvitationLink(link, key = 'created') {
  if (!link || copyingLinkKey.value) return
  copyingLinkKey.value = key
  if (key === 'created') {
    copyError.value = ''
    copyHint.value = ''
  }
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(link)
      if (key === 'created') {
        copyHint.value = '邀请链接已复制，发给 Ta 即可。'
      } else {
        ElMessage.success('邀请链接已复制')
      }
      return
    }
    throw new Error('clipboard-unavailable')
  } catch {
    if (key === 'created') {
      copyError.value = '当前浏览器不允许自动复制。'
    } else {
      ElMessage.error('当前浏览器不允许自动复制，请手动选中链接复制')
    }
  } finally {
    copyingLinkKey.value = ''
  }
}

async function revokeInvitation(invitation) {
  if (revokingInvitationId.value != null) return
  revokingInvitationId.value = invitation.invitationId
  pendingInvitationsError.value = ''
  try {
    const { data } = await revokeSpaceInvitation(invitation.invitationId)
    if (!data?.success) {
      throw new Error(data?.message || '撤销邀请失败')
    }
    ElMessage.success('邀请已撤销')
    // 被撤销的那条不再出现在列表里，若正是当前展示的结果则一并收起。
    if (createdInvitation.value?.invitationId === invitation.invitationId) {
      dismissCreatedInvitation()
    }
    await refreshSpaceStatus()
    await loadPendingInvitations()
  } catch (error) {
    pendingInvitationsError.value = readInviteErrorMessage(error, '撤销邀请失败，请稍后重试')
    // 邀请可能刚好被接受或过期，刷新列表以反映真实状态。
    await loadPendingInvitations()
  } finally {
    revokingInvitationId.value = null
  }
}

async function createSpace() {
  if (creating.value) return
  const spaceName = createForm.spaceName.trim()
  const description = createForm.description.trim()
  if (spaceName.length > 30) {
    createError.value = '空间名称不能超过 30 个字符'
    return
  }
  if (description.length > 500) {
    createError.value = '空间简介不能超过 500 个字符'
    return
  }

  creating.value = true
  createError.value = ''
  try {
    const { data } = await createCoupleSpace({
      spaceName,
      description,
      loveStartTime: toBackendDateTime(createForm.loveStartTime),
    })
    if (!data?.success) {
      if (String(data?.errorCode ?? '') === '20033') {
        await refreshSpaceStatus()
      }
      throw new Error(data?.message || '创建情侣空间失败')
    }
    ElMessage.success('情侣空间创建成功')
    // 不能只依赖创建接口的返回值，必须重新拉取 /space/status 确认上下文。
    await refreshSpaceStatus()
    if (isSpaceWaiting.value) {
      // 新建空间必然处于等待绑定，直接留在本页展示邀请区，而不是跳走。
      await loadPendingInvitations()
      await nextTick()
      document.getElementById('space-invite-partner')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else if (isSpaceReady.value) {
      router.replace('/')
    }
  } catch (error) {
    createError.value = readSpaceErrorMessage(error, '创建情侣空间失败，请稍后重试')
  } finally {
    creating.value = false
  }
}

/**
 * 预览邀请。
 *
 * - 每次预览前清空旧的 preview / 错误 / token，避免用户改动输入后用旧结果去接受；
 * - 用递增序号丢弃过期响应：慢请求返回时如果 token 已经变了，结果直接丢弃；
 * - 网络错误与业务“邀请不存在”分开提示，不能把断网说成邀请失效。
 */
async function loadInvitationPreview() {
  const token = extractInvitationToken(inviteToken.value)
  clearPreview()
  if (!token) {
    previewError.value = '请输入邀请链接'
    return
  }

  const requestId = ++previewSequence
  previewing.value = true
  previewToken.value = token
  try {
    const { data } = await previewSpaceInvitation(token)
    if (requestId !== previewSequence) return
    if (!data?.success) {
      previewError.value = data?.message || '邀请不存在或已失效'
      return
    }
    if (!data?.data) {
      previewError.value = '邀请不存在或已失效'
      return
    }
    preview.value = data.data
  } catch (error) {
    if (requestId !== previewSequence) return
    previewError.value = readInviteErrorMessage(error, '邀请预览失败，请稍后重试')
  } finally {
    if (requestId === previewSequence) previewing.value = false
  }
}

/** 清空预览状态；token 变化时旧 preview 必须立即失效。 */
function clearPreview() {
  previewSequence += 1
  preview.value = null
  previewToken.value = ''
  previewError.value = ''
  acceptError.value = ''
  previewing.value = false
}

/**
 * 接受成功后的统一收尾。
 *
 * 必须重新请求 /space/status：accept 返回值不能直接写进全局空间状态，
 * 否则刷新后会出现前端与后端不一致。
 */
async function finishBinding() {
  ElMessage.success('已加入情侣空间')
  clearPreview()
  await refreshSpaceStatus()

  // 拿到站点状态后优先回到原本要访问的页面。
  if (redirectBackWhenReady()) return
  if (isSpaceReady.value) {
    router.replace('/')
    return
  }
  // 极端情况下（例如空间刚被冻结）没有进入可用状态，留在本页并刷新列表。
  if (!spaceError.value) await loadReceivedInvitations()
}

async function acceptPreviewInvitation() {
  if (acceptingToken.value) return
  if (!canAcceptInvitation(preview.value, frontendLoggedIn.value)) return
  // 预览所用的 token 必须仍是输入框里的这一个，避免拿旧预览接受新链接。
  const token = extractInvitationToken(inviteToken.value)
  if (!token || token !== previewToken.value) {
    clearPreview()
    previewError.value = '邀请内容已变化，请重新预览'
    return
  }

  acceptingToken.value = true
  acceptError.value = ''
  try {
    const { data } = await acceptSpaceInvitation({ token })
    if (!data?.success) {
      // 业务失败（过期/已撤销/目标不匹配/已满/已在其他空间）展示后端 message。
      acceptError.value = data?.message || '接受邀请失败'
      await refreshAfterAcceptFailure()
      return
    }
    await finishBinding()
  } catch (error) {
    acceptError.value = readInviteErrorMessage(error, '接受邀请失败，请稍后重试')
  } finally {
    acceptingToken.value = false
  }
}

/** 接受失败后刷新状态与预览，让界面对齐服务端真实结果。 */
async function refreshAfterAcceptFailure() {
  await refreshSpaceStatus()
  if (preview.value) {
    // 重新预览一次，更新 joinable / alreadyMember / inOtherSpace 等字段。
    const token = previewToken.value
    if (token) {
      try {
        const { data } = await previewSpaceInvitation(token)
        if (data?.success && data.data) preview.value = data.data
      } catch {
        // 刷新预览失败不覆盖用户已经看到的接受错误。
      }
    }
  }
}

async function acceptReceivedInvitation(invitation) {
  if (acceptingInvitationId.value != null) return
  // 定向邀请用 invitationId；链接邀请没有受邀人，只能凭 token 接受。
  if (!invitation?.invitationId) return
  acceptingInvitationId.value = invitation.invitationId
  invitationActionError.value = ''
  try {
    const { data } = await acceptSpaceInvitation({ invitationId: invitation.invitationId })
    if (!data?.success) {
      // 已过期/已撤销/已被接受/空间已满/已在其他空间都属于业务失败，直接展示后端文案。
      invitationActionError.value = data?.message || '接受邀请失败'
      await refreshAfterAcceptFailure()
      await loadReceivedInvitations()
      return
    }
    await finishBinding()
  } catch (error) {
    invitationActionError.value = readInviteErrorMessage(error, '接受邀请失败，请稍后重试')
    // 网络失败不清空列表，只提示重试；也不要把断网说成邀请不存在。
    if (!isNetworkFailure(error)) await loadReceivedInvitations()
  } finally {
    acceptingInvitationId.value = null
  }
}

/** 判断是否为纯网络层失败（无 HTTP 响应）。 */
function isNetworkFailure(error) {
  if (error?.response) return false
  return error?.code === 'ERR_NETWORK'
    || error?.code === 'ECONNABORTED'
    || error?.message === 'Network Error'
}

// token 一旦变化，旧 preview 立即失效，杜绝用旧结果接受新 token。
// token 变化时旧 preview 必须立即失效。
// 但 onMounted 会先把 URL 上的 token 写进输入框，此时不能把刚发出的预览清掉，
// 因此只有解析结果与“正在预览的 token”不同才清理。
watch(inviteToken, (value) => {
  const next = extractInvitationToken(value)
  if (next && next === previewToken.value) return
  clearPreview()
})

onMounted(async () => {
  // 先把 URL 上的 token 落进输入框：未登录也要保留，登录回跳后不能丢。
  const tokenFromQuery = typeof route.query.token === 'string' ? route.query.token.trim() : ''
  if (tokenFromQuery) inviteToken.value = tokenFromQuery

  if (!frontendLoggedIn.value) {
    // 未登录只做预览，不请求空间状态，也不触碰任何需要登录的接口。
    if (tokenFromQuery) await loadInvitationPreview()
    return
  }

  await refreshSpaceStatus()
  if (redirectBackWhenReady()) return

  // status=0：创建者需要在这里管理待绑定邀请。
  if (isSpaceWaiting.value) {
    await loadPendingInvitations()
  } else if ((!hasCoupleSpace.value || isUnboundSpace(spaceStatus.value)) && !spaceError.value) {
    await loadReceivedInvitations()
    if (tokenFromQuery) await loadInvitationPreview()
  }

  // 对方已经加入（status 变成 1）时，若本页带着邀请链接，仍然展示预览结果。
  if (hasCoupleSpace.value && tokenFromQuery) {
    await loadInvitationPreview()
  }

  await nextTick()
  scrollToAction()
})
</script>

<style scoped>
/* ------------------------------------------------------------------
   恋爱开始时间选择器
   组件默认是蓝色 Material 风格。它的面板自己带 .dp--theme-light，
   会在内部把整组变量重置回蓝色，所以变量要同时定义在
   .dp--main（输入框）和 .dp--menu（弹出的日历面板）上。
   面板通过 teleport=false 留在组件内部，scoped 样式才能命中。
   ------------------------------------------------------------------ */
.love-start-picker :deep(.dp--main),
.love-start-picker :deep(.dp--menu) {
  --dp-font-family: 'Nunito', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  --dp-font-size: 0.875rem;
  --dp-border-radius: 0.75rem;
  --dp-cell-border-radius: 0.6rem;
  --dp-background-color: #ffffff;
  --dp-text-color: #4c0519;
  --dp-primary-color: #f43f5e;
  --dp-primary-disabled-color: #fda4af;
  --dp-primary-text-color: #ffffff;
  /* 上月 / 下月的溢出日期与禁用日期用中性灰，避免整屏泛粉。 */
  --dp-secondary-color: #d8c4c9;
  --dp-border-color: #fecdd3;
  --dp-border-color-hover: #fda4af;
  --dp-border-color-focus: #fb7185;
  --dp-menu-border-color: #ffe4e6;
  --dp-hover-color: #fff1f2;
  --dp-hover-text-color: #be123c;
  --dp-hover-icon-color: #e11d48;
  --dp-icon-color: #fb7185;
  --dp-highlight-color: rgb(244 63 94 / 0.12);
  --dp-menu-min-width: 21rem;
  --dp-cell-size: 2.2rem;
  --dp-input-padding: 0.75rem 2.6rem 0.75rem 1rem;
  --dp-menu-padding: 0.65rem 0.7rem;
  --dp-action-buttons-padding: 0.25rem 0.6rem;
  /* 底部预览要能放下一整行中文日期，否则会被省略号截断。 */
  --dp-preview-font-size: 0.75rem;
}

.love-start-picker :deep(.dp--main) {
  width: 100%;
}

/* 输入框：与页面其它表单控件同款的圆角、粉色描边和聚焦光晕 */
.love-start-picker :deep(.dp--input) {
  width: 100%;
  border: 1px solid #fecdd3;
  box-shadow: 0 1px 2px rgb(76 5 25 / 0.03);
  color: #4c0519;
  transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
}

.love-start-picker :deep(.dp--input::placeholder) {
  color: #fda4af;
  opacity: 1;
}

.love-start-picker :deep(.dp--input:hover:not(.dp--input-focus)) {
  border-color: #fda4af;
}

.love-start-picker :deep(.dp--input-focus) {
  border-color: #fb7185;
  box-shadow: 0 0 0 4px #ffe4e6;
}

/* 日历图标：改成粉色心形日历，鼠标悬停时轻微放大 */
.love-start-picker :deep(.dp--input-icon) {
  inset-inline-start: 0.95rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fb7185;
  transition: color 160ms ease, transform 160ms ease;
}

.love-start-picker :deep(.dp--input-icon:hover) {
  color: #e11d48;
  transform: translateY(-50%) scale(1.06);
}

.love-start-picker__icon svg {
  width: 1.15rem;
  height: 1.15rem;
}

.love-start-picker :deep(.dp--action-row) {
  gap: 0.35rem;
  align-items: center;
}

.love-start-picker :deep(.dp--selection-preview) {
  overflow: visible;
  text-overflow: clip;
  white-space: nowrap;
}

/* 弹出面板：更柔和的圆角、更轻的阴影 */
.love-start-picker :deep(.dp--menu) {
  border-radius: 1rem;
  box-shadow: 0 18px 45px rgb(76 5 25 / 0.13);
  font-family: 'Nunito', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.love-start-picker :deep(.dp--calendar-header-cell) {
  border-bottom-color: #ffe4e6;
  color: #9f1239;
  font-weight: 600;
}

.love-start-picker :deep(.dp--cell-inner) {
  font-weight: 500;
}

.love-start-picker :deep(.dp--today) {
  border-color: #fb7185;
  font-weight: 700;
}

.love-start-picker :deep(.dp--active) {
  background: linear-gradient(135deg, #fb7185 0%, #f43f5e 100%);
  box-shadow: 0 4px 12px rgb(244 63 94 / 0.28);
}

.love-start-picker :deep(.dp--inner-nav:hover) {
  background: #fff1f2;
  color: #e11d48;
}

.love-start-picker :deep(.dp--time-col-block) {
  font-family: 'Nunito', 'PingFang SC', sans-serif;
  font-weight: 600;
  color: #9f1239;
}

.love-start-picker :deep(.dp--tp-inline-btn-bar) {
  background-color: #ffe4e6;
}

.love-start-picker :deep(.dp--action-select) {
  border-radius: 0.55rem;
  font-weight: 600;
}

.love-start-picker :deep(.dp--action-cancel) {
  border-radius: 0.55rem;
  color: #9f1239;
}
</style>
