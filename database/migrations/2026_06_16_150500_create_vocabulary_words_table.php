<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vocabulary_words', function (Blueprint $table) {
            $table->id();
            $table->string('lemma', 100)->comment('单词原型 / 词条');
            $table->string('phonetic', 100)->nullable()->comment('音标');
            $table->string('pos', 50)->nullable()->comment('词性');
            $table->string('grade_level', 30)->nullable()->comment('推荐年级：三年级/高一等');
            $table->string('level_tag', 30)->nullable()->comment('难度等级：小学/初中/高中/CET4/CET6 等');
            $table->json('meanings')->nullable()->comment('释义列表');
            $table->json('examples')->nullable()->comment('例句列表');
            $table->timestamps();

            $table->unique(['lemma'], 'uk_vocab_lemma');
            $table->index(['grade_level', 'level_tag'], 'idx_vocab_grade_level');
        });

        // 为题目表添加 word_id 字段（可为空），用于引用词汇表
        Schema::table('levelup_questions', function (Blueprint $table) {
            if (!Schema::hasColumn('levelup_questions', 'word_id')) {
                $table->unsignedBigInteger('word_id')->nullable()->after('word')->comment('vocabulary_words.id');
                $table->index('word_id', 'idx_questions_word_id');
            }
        });

        // 迁移现有 vocab 题目的 word 到 vocabulary_words 表，并回填 word_id
        // 注意：保持幂等性，避免重复插入。
        $distinctWords = DB::table('levelup_questions')
            ->whereIn('type', ['vocab', 'vocabulary'])
            ->whereNotNull('word')
            ->where('word', '!=', '')
            ->select('word')
            ->distinct()
            ->pluck('word');

        foreach ($distinctWords as $lemma) {
            $lemma = trim((string) $lemma);
            if ($lemma === '') {
                continue;
            }

            $existingId = DB::table('vocabulary_words')->where('lemma', $lemma)->value('id');
            if (!$existingId) {
                $existingId = DB::table('vocabulary_words')->insertGetId([
                    'lemma' => $lemma,
                    'phonetic' => null,
                    'pos' => null,
                    'grade_level' => null,
                    'level_tag' => null,
                    'meanings' => null,
                    'examples' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            DB::table('levelup_questions')
                ->whereIn('type', ['vocab', 'vocabulary'])
                ->where('word', $lemma)
                ->whereNull('word_id')
                ->update(['word_id' => $existingId]);
        }
    }

    public function down(): void
    {
        // 回滚时仅移除外键字段和词汇表，不尝试还原 word_id 映射
        if (Schema::hasColumn('levelup_questions', 'word_id')) {
            Schema::table('levelup_questions', function (Blueprint $table) {
                $table->dropIndex('idx_questions_word_id');
                $table->dropColumn('word_id');
            });
        }

        Schema::dropIfExists('vocabulary_words');
    }
};

