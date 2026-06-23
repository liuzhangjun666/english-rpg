<template>
  <ReviewModal v-model:visible="panels.showReview" />
  <HeartDemonRecord v-model:visible="panels.showDemons" />
  <AchievementsModal v-model:visible="panels.showAchievements" />
  <ProfilePanel
    v-model:visible="panels.showProfile"
    @open-review="panels.showReview = true"
    @open-parent="panels.showParentDashboard = true"
  />
  <DailyQuestPanel v-model:visible="panels.showDailyQuest" />
  <SignInPanel v-model:visible="panels.showSignIn" />
  <InnerDemonPanel v-model:visible="panels.showInnerDemon" :auto-challenge="panels.innerDemonAutoChallenge" />
  <ParentDashboardPanel v-model:visible="panels.showParentDashboard" />
  <AiAskPanel v-model:visible="panels.showAiAsk" />
  <PetGardenPanel v-model:visible="panels.showPets" />
  <StoragePanel v-model:visible="panels.showStorage" />
  <EventsPanel
    v-model:visible="panels.showEvents"
    :on-open-daily-quest="() => { panels.showEvents = false; panels.showDailyQuest = true; }"
    :on-open-sign-in="() => { panels.showEvents = false; panels.showSignIn = true; }"
    :on-open-mijing="() => { panels.showEvents = false; emit('go-mijing'); }"
  />
  <MailPanel
    v-model:visible="panels.showMail"
    :on-open-daily-quest="() => { panels.showMail = false; panels.showDailyQuest = true; }"
    :on-open-sign-in="() => { panels.showMail = false; panels.showSignIn = true; }"
  />
  <SettingsPanel
    v-model:visible="panels.showSettings"
    @open-parent="panels.showParentDashboard = true"
  />
  <WorldBossPanel
    v-model:visible="panels.showWorldBoss"
    @start="emit('go-world-boss')"
  />
</template>

<script setup lang="ts">
import type { HallPanelsState } from '../../composables/useHallPanels';
import ReviewModal from '../../views/ReviewModal.vue';
import AchievementsModal from '../../views/AchievementsModal.vue';
import DailyQuestPanel from '../../views/DailyQuestPanel.vue';
import ProfilePanel from '../profile/ProfilePanel.vue';
import HeartDemonRecord from '../demons/HeartDemonRecord.vue';
import InnerDemonPanel from '../demons/InnerDemonPanel.vue';
import ParentDashboardPanel from './ParentDashboardPanel.vue';
import SignInPanel from './SignInPanel.vue';
import AiAskPanel from './AiAskPanel.vue';
import PetGardenPanel from './PetGardenPanel.vue';
import StoragePanel from './StoragePanel.vue';
import EventsPanel from './EventsPanel.vue';
import MailPanel from './MailPanel.vue';
import SettingsPanel from './SettingsPanel.vue';
import WorldBossPanel from './WorldBossPanel.vue';

defineProps<{ panels: HallPanelsState }>();
const emit = defineEmits<{
  (e: 'go-mijing'): void;
  (e: 'go-world-boss'): void;
}>();
</script>
