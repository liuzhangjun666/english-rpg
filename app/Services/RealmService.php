<?php

namespace App\Services;

use App\Models\User;
use App\Support\CultivationProfile;

/**
 * 境界突破引擎
 */
class RealmService
{
    public function __construct(
        private readonly PracticeLevelService $levelService,
    ) {
    }

    private const CULTIVATION_REALM_GROUPS = ['练气', '筑基', '金丹', '元婴', '化神', '炼虚', '合体', '大乘', '渡劫'];

    private const REALM_CODE_PREFIXES = ['L', 'Z', 'J', 'Y', 'H', 'X', 'T', 'D', 'U'];

    private const CHINESE_LAYER_MAP = [
        1 => '一层',
        2 => '二层',
        3 => '三层',
        4 => '四层',
        5 => '五层',
        6 => '六层',
        7 => '七层',
        8 => '八层',
        9 => '九层',
    ];

    public const DIMENSION_KEYS = ['vocabulary', 'grammar', 'reading', 'listening', 'writing', 'speaking'];

    public const ENERGY_PER_CORRECT = 10;

    public const ENERGY_PER_CORRECT_BY_DIMENSION = [
        'vocabulary' => 1,
        'grammar' => 2,
        'listening' => 2,
        'speaking' => 2,
        'reading' => 3,
        'writing' => 5,
    ];

    public const ENERGY_STEP_PER_REALM = 100;

    private const DIMENSION_LABELS = [
        'vocabulary' => '词汇',
        'grammar' => '语法',
        'reading' => '阅读',
        'listening' => '听力',
        'writing' => '写作',
        'speaking' => '口语',
    ];

    /** 获取境界序号 */
    public function getRealmIndex(string $realm): int
    {
        return CultivationProfile::realmOrderIndex($realm);
    }

    public function getCultivationRealmIndex(string $realmName): int
    {
        $matched = [];
        if (!preg_match('/^(练气|筑基|金丹|元婴|化神|炼虚|合体|大乘|渡劫)([一二三四五六七八九]|[1-9])层$/u', trim($realmName), $matched)) {
            return -1;
        }

        $group = (string) ($matched[1] ?? '');
        $groupIndex = array_search($group, self::CULTIVATION_REALM_GROUPS, true);
        if ($groupIndex === false) {
            return -1;
        }

        $layer = $this->parseLayerToken((string) ($matched[2] ?? ''));
        if ($layer < 1) {
            return -1;
        }

        return ($groupIndex * 9) + $layer - 1;
    }

    public function resolveCurrentRealm(User $user): string
    {
        $currentRealm = trim((string) ($user->current_realm ?? ''));
        $derivedRealm = $this->buildCurrentRealmName(
            (string) ($user->realm ?? 'L1'),
            max(1, min(9, (int) ($user->realm_stage ?? 1)))
        );

        $currentIndex = $this->getCultivationRealmIndex($currentRealm);
        $derivedIndex = $this->getCultivationRealmIndex($derivedRealm);

        if ($currentIndex >= 0 && $derivedIndex >= 0) {
            return $currentIndex >= $derivedIndex ? $currentRealm : $derivedRealm;
        }

        if ($currentIndex >= 0) {
            return $currentRealm;
        }

        return $derivedRealm;
    }

    /**
     * 将「练气五层」类展示名解析为 realm 代码与层数。
     *
     * @return array{realm: string, realm_stage: int, current_realm: string}|null
     */
    public function decomposeRealmLabel(string $realmLabel): ?array
    {
        $realmLabel = trim($realmLabel);
        if (!preg_match('/^(练气|筑基|金丹|元婴|化神|炼虚|合体|大乘|渡劫)([一二三四五六七八九]|[1-9])层$/u', $realmLabel, $matched)) {
            return null;
        }

        $group = (string) ($matched[1] ?? '');
        $groupIndex = array_search($group, self::CULTIVATION_REALM_GROUPS, true);
        if ($groupIndex === false) {
            return null;
        }

        $layer = $this->parseLayerToken((string) ($matched[2] ?? ''));
        if ($layer < 1) {
            return null;
        }

        $realmCode = (self::REALM_CODE_PREFIXES[$groupIndex] ?? 'L') . '1';
        $currentRealm = $group . (self::CHINESE_LAYER_MAP[$layer] ?? ($layer . '层'));

        return [
            'realm' => $realmCode,
            'realm_stage' => $layer,
            'current_realm' => $currentRealm,
        ];
    }

    public function applyRealmLabelToUser(User $user, string $realmLabel): User
    {
        $parts = $this->decomposeRealmLabel($realmLabel);
        if (!$parts) {
            return $user;
        }

        $user->realm = $parts['realm'];
        $user->realm_stage = $parts['realm_stage'];
        $user->current_realm = $parts['current_realm'];
        $user->save();

        return $user->refresh();
    }

    private function getRealmRequirements(User $user): array
    {
        return $this->levelService->getBreakthroughRequirements($user);
    }

    public function getBreakthroughStatus(User $user): array
    {
        $currentRealm = $this->resolveCurrentRealm($user);
        $realmIndex = $this->getCultivationRealmIndex($currentRealm);
        if ($realmIndex < 0) {
            $realmIndex = 0;
            $currentRealm = $this->getRealmNameByIndex(0) ?? '练气一层';
        }

        $nextRealm = $this->getRealmNameByIndex($realmIndex + 1);
        $isMaxRealm = $nextRealm === null;
        $requirements = $this->getRealmRequirements($user);
        $totalCurriculum = (int) ($requirements['total_curriculum'] ?? 0);
        $energyCurrent = max(0, (int) ($user->cultivation_energy ?? 0));
        $energyRequired = (int) ($requirements['requiredEnergy'] ?? 0);
        $energyGap = max(0, $energyRequired - $energyCurrent);

        $dimensionStatus = [];
        $missingRequirements = [];
        foreach (self::DIMENSION_KEYS as $key) {
            $required = (int) ($requirements[$key] ?? 0);
            $current = max(0, (int) ($user->{$key} ?? 0));
            $gap = max(0, $required - $current);
            $met = $gap === 0;

            $dimensionStatus[$key] = [
                'label' => self::DIMENSION_LABELS[$key] ?? $key,
                'current' => $current,
                'required' => $required,
                'gap' => $gap,
                'met' => $met,
            ];

            if (!$met) {
                $missingRequirements[] = [
                    'key' => $key,
                    'label' => self::DIMENSION_LABELS[$key] ?? $key,
                    'current' => $current,
                    'required' => $required,
                    'gap' => $gap,
                ];
            }
        }

        if ($energyGap > 0) {
            $missingRequirements[] = [
                'key' => 'cultivation_energy',
                'label' => '突破修为',
                'current' => $energyCurrent,
                'required' => $energyRequired,
                'gap' => $energyGap,
            ];
        }

        $canBreakthrough = !$isMaxRealm && $totalCurriculum > 0 && empty($missingRequirements);
        $message = $isMaxRealm
            ? '当前已达 MVP 最高境界'
            : ($totalCurriculum <= 0
                ? '当前境界暂无修炼题库，无法突破'
                : ($canBreakthrough ? '突破条件已满足，可开始突破' : '突破条件未满足'));
        $progressTotal = $energyRequired;
        $progressCurrent = min($energyCurrent, $energyRequired);
        foreach ($dimensionStatus as $item) {
            $progressTotal += (int) ($item['required'] ?? 0);
            $progressCurrent += min((int) ($item['current'] ?? 0), (int) ($item['required'] ?? 0));
        }
        $progressPercent = $isMaxRealm
            ? 100
            : max(0, min(100, (int) round(($progressCurrent / max(1, $progressTotal)) * 100)));

        return [
            'current_realm' => $currentRealm,
            'current_realm_index' => $realmIndex + 1,
            'next_realm' => $nextRealm,
            'is_max_realm' => $isMaxRealm,
            'message' => $message,
            'can_breakthrough' => $canBreakthrough,
            'requirements' => $requirements,
            'curriculum_total' => $totalCurriculum,
            'dimensions' => $dimensionStatus,
            'cultivation_energy' => [
                'current' => $energyCurrent,
                'required' => $energyRequired,
                'gap' => $energyGap,
                'met' => $energyGap === 0,
            ],
            'missing_requirements' => $missingRequirements,
            'realm_progress_percent' => $progressPercent,
            'remaining_energy_to_next_realm' => $isMaxRealm ? 0 : $energyGap,
        ];
    }

    /** 检查是否可突破到下一个境界/阶段 */
    public function canBreakthrough(User $user): array
    {
        $status = $this->getBreakthroughStatus($user);
        return [
            'can' => $status['can_breakthrough'],
            'reason' => $status['message'],
            'missing' => $status['missing_requirements'],
            'status' => $status,
        ];
    }

    /** 执行突破 */
    public function breakthrough(User $user): array
    {
        $status = $this->getBreakthroughStatus($user);
        if ($status['is_max_realm']) {
            return [
                'type' => 'maxed',
                'message' => '当前已达 MVP 最高境界',
                'breakthrough' => false,
                'status' => $status,
            ];
        }

        if (!$status['can_breakthrough']) {
            return [
                'type' => 'blocked',
                'message' => '突破条件未满足',
                'breakthrough' => false,
                'status' => $status,
                'missing_requirements' => $status['missing_requirements'],
            ];
        }

        $fromRealm = $status['current_realm'];
        $toRealm = (string) $status['next_realm'];
        $legacyOldRealm = (string) ($user->realm ?? 'L1');
        $legacyOldStage = max(1, (int) ($user->realm_stage ?? 1));
        $nextRealmCode = $this->getRealmCodeByIndex(max(0, $this->getCultivationRealmIndex($toRealm)));
        $nextStage = $this->getRealmStageByIndex(max(0, $this->getCultivationRealmIndex($toRealm)));

        $user->current_realm = $toRealm;
        $user->realm = $nextRealmCode;
        $user->realm_stage = $nextStage;
        foreach (self::DIMENSION_KEYS as $key) {
            $user->{$key} = 0;
        }
        $user->cultivation_energy = 0;
        $user->save();

        return [
            'type' => 'realm_up',
            'message' => "突破成功：{$fromRealm} → {$toRealm}",
            'breakthrough' => true,
            'old_realm' => $legacyOldRealm,
            'new_realm' => $nextRealmCode,
            'old_stage' => $legacyOldStage,
            'new_stage' => $nextStage,
            'from_current_realm' => $fromRealm,
            'to_current_realm' => $toRealm,
            'status' => $this->getBreakthroughStatus($user->fresh()),
        ];
    }

    public function applyCultivationGain(User $user, string $dimension, int $correctCount): array
    {
        $normalizedCount = max(0, $correctCount);
        if ($normalizedCount === 0) {
            return array_merge($this->getCultivationProgress($user), ['energy_gained' => 0]);
        }

        if (!in_array($dimension, self::DIMENSION_KEYS, true)) {
            return array_merge($this->getCultivationProgress($user), ['energy_gained' => 0]);
        }

        $user->{$dimension} = max(0, (int) ($user->{$dimension} ?? 0)) + $normalizedCount;
        $energyPerCorrect = (int) (self::ENERGY_PER_CORRECT_BY_DIMENSION[$dimension] ?? self::ENERGY_PER_CORRECT);
        $energyGained = $normalizedCount * $energyPerCorrect;
        $user->cultivation_energy = max(0, (int) ($user->cultivation_energy ?? 0)) + $energyGained;

        $snapshot = $this->getCultivationProgress($user);
        $user->current_realm = $this->resolveCurrentRealm($user);
        $user->save();

        return array_merge($snapshot, ['energy_gained' => $energyGained]);
    }

    public function getCultivationProgress(User $user): array
    {
        $status = $this->getBreakthroughStatus($user);
        $abilities = [];
        foreach (self::DIMENSION_KEYS as $key) {
            $item = $status['dimensions'][$key] ?? [
                'current' => 0,
                'required' => 0,
                'met' => false,
            ];
            $abilities[$key] = [
                'value' => (int) ($item['current'] ?? 0),
                'target' => (int) ($item['required'] ?? 0),
                'met' => (bool) ($item['met'] ?? false),
            ];
        }
        return [
            'current_realm' => $status['current_realm'],
            'current_realm_index' => $status['current_realm_index'],
            'cultivation_energy' => (int) ($status['cultivation_energy']['current'] ?? 0),
            'next_realm' => $status['next_realm'],
            'next_realm_energy' => (int) ($status['cultivation_energy']['required'] ?? 0),
            'realm_progress_percent' => $status['realm_progress_percent'],
            'remaining_energy_to_next_realm' => $status['remaining_energy_to_next_realm'],
            'abilities' => $abilities,
            'breakthrough_conditions' => [
                'energy' => [
                    'current' => (int) ($status['cultivation_energy']['current'] ?? 0),
                    'required' => (int) ($status['cultivation_energy']['required'] ?? 0),
                    'met' => (bool) ($status['cultivation_energy']['met'] ?? false),
                ],
                'abilities' => [
                    'required_each' => $status['requirements'],
                    'met' => empty($status['missing_requirements']),
                ],
            ],
            'can_breakthrough' => $status['can_breakthrough'],
            'is_max_realm' => $status['is_max_realm'],
            'missing_requirements' => $status['missing_requirements'],
            'breakthrough_message' => $status['message'],
        ];
    }

    private function parseLayerToken(string $layerToken): int
    {
        $layerToken = trim($layerToken);
        if ($layerToken === '') {
            return 0;
        }

        if (ctype_digit($layerToken)) {
            return max(1, min(9, (int) $layerToken));
        }

        $map = [
            '一' => 1,
            '二' => 2,
            '三' => 3,
            '四' => 4,
            '五' => 5,
            '六' => 6,
            '七' => 7,
            '八' => 8,
            '九' => 9,
        ];

        return $map[$layerToken] ?? 0;
    }

    private function getRealmNameByIndex(int $index): ?string
    {
        if ($index < 0) {
            return null;
        }

        $groupIndex = intdiv($index, 9);
        $layer = ($index % 9) + 1;
        $group = self::CULTIVATION_REALM_GROUPS[$groupIndex] ?? null;
        if ($group === null) {
            return null;
        }

        $layerName = self::CHINESE_LAYER_MAP[$layer] ?? ($layer . '层');
        return $group . $layerName;
    }

    private function getRealmCodeByIndex(int $index): string
    {
        $groupIndex = max(0, intdiv($index, 9));
        $prefix = self::REALM_CODE_PREFIXES[$groupIndex] ?? self::REALM_CODE_PREFIXES[0];
        return $prefix . '1';
    }

    private function getRealmStageByIndex(int $index): int
    {
        return max(1, min(9, ($index % 9) + 1));
    }

    private function buildCurrentRealmName(string $realmCode, int $realmStage): string
    {
        $prefix = CultivationProfile::realmPrefix($realmCode);
        $groupIndex = array_search($prefix, self::REALM_CODE_PREFIXES, true);
        $group = self::CULTIVATION_REALM_GROUPS[$groupIndex !== false ? $groupIndex : 0] ?? self::CULTIVATION_REALM_GROUPS[0];
        $layer = max(1, min(9, $realmStage));
        $layerName = self::CHINESE_LAYER_MAP[$layer] ?? ($layer . '层');

        return $group . $layerName;
    }

    public function composeCurrentRealm(string $realmCode, int $realmStage): string
    {
        return $this->buildCurrentRealmName($realmCode, $realmStage);
    }
}
