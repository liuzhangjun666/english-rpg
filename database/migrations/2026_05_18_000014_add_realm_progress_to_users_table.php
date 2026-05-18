<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $tableName = 'levelup_users';

        $hasCurrentRealm = Schema::hasColumn($tableName, 'current_realm');
        $hasCultivationEnergy = Schema::hasColumn($tableName, 'cultivation_energy');
        $hasVocabulary = Schema::hasColumn($tableName, 'vocabulary');
        $hasGrammar = Schema::hasColumn($tableName, 'grammar');
        $hasReading = Schema::hasColumn($tableName, 'reading');
        $hasListening = Schema::hasColumn($tableName, 'listening');
        $hasWriting = Schema::hasColumn($tableName, 'writing');
        $hasSpeaking = Schema::hasColumn($tableName, 'speaking');

        Schema::table($tableName, function (Blueprint $table) use (
            $hasCurrentRealm,
            $hasCultivationEnergy,
            $hasVocabulary,
            $hasGrammar,
            $hasReading,
            $hasListening,
            $hasWriting,
            $hasSpeaking
        ) {
            if (!$hasCurrentRealm) {
                $table->string('current_realm', 30)->default('练气一层')->comment('灵修当前境界');
            }
            if (!$hasCultivationEnergy) {
                $table->unsignedBigInteger('cultivation_energy')->default(0)->comment('灵修修为值');
            }
            if (!$hasVocabulary) {
                $table->unsignedInteger('vocabulary')->default(0)->comment('词汇能力值');
            }
            if (!$hasGrammar) {
                $table->unsignedInteger('grammar')->default(0)->comment('语法能力值');
            }
            if (!$hasReading) {
                $table->unsignedInteger('reading')->default(0)->comment('阅读能力值');
            }
            if (!$hasListening) {
                $table->unsignedInteger('listening')->default(0)->comment('听力能力值');
            }
            if (!$hasWriting) {
                $table->unsignedInteger('writing')->default(0)->comment('写作能力值');
            }
            if (!$hasSpeaking) {
                $table->unsignedInteger('speaking')->default(0)->comment('口语能力值');
            }
        });
    }

    public function down(): void
    {
        $tableName = 'levelup_users';
        $dropColumns = [];

        foreach ([
            'current_realm',
            'cultivation_energy',
            'vocabulary',
            'grammar',
            'reading',
            'listening',
            'writing',
            'speaking',
        ] as $column) {
            if (Schema::hasColumn($tableName, $column)) {
                $dropColumns[] = $column;
            }
        }

        if (empty($dropColumns)) {
            return;
        }

        Schema::table($tableName, function (Blueprint $table) use ($dropColumns) {
            $table->dropColumn($dropColumns);
        });
    }
};
