<?php

namespace App\Services;

use App\Models\JadeLedger;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class JadeLedgerService
{
    public function credit(User $user, int $amount, string $sourceType, ?string $sourceId = null, ?string $remark = null): int
    {
        if ($amount <= 0) {
            return (int) $user->jade_balance;
        }

        return $this->applyDelta($user, $amount, $sourceType, $sourceId, $remark);
    }

    public function debit(User $user, int $amount, string $sourceType, ?string $sourceId = null, ?string $remark = null): int
    {
        if ($amount <= 0) {
            return (int) $user->jade_balance;
        }

        return $this->applyDelta($user, -$amount, $sourceType, $sourceId, $remark);
    }

    private function applyDelta(User $user, int $delta, string $sourceType, ?string $sourceId, ?string $remark): int
    {
        return (int) DB::transaction(function () use ($user, $delta, $sourceType, $sourceId, $remark) {
            $locked = User::query()->whereKey($user->id)->lockForUpdate()->first();
            if (! $locked) {
                throw new \RuntimeException('用户不存在');
            }

            $nextBalance = (int) $locked->jade_balance + $delta;
            if ($nextBalance < 0) {
                throw new \RuntimeException('仙玉不足');
            }

            $locked->jade_balance = $nextBalance;
            $locked->save();

            JadeLedger::query()->create([
                'user_id' => $locked->id,
                'delta' => $delta,
                'balance_after' => $nextBalance,
                'source_type' => $sourceType,
                'source_id' => $sourceId,
                'remark' => $remark,
                'created_at' => now(),
            ]);

            return $nextBalance;
        });
    }
}
