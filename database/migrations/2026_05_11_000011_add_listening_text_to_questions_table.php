<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('levelup_questions', function (Blueprint $table) {
            if (!Schema::hasColumn('levelup_questions', 'listening_text')) {
                $table->text('listening_text')->nullable()->after('question')->comment('听力材料文本');
            }
        });
    }

    public function down(): void
    {
        Schema::table('levelup_questions', function (Blueprint $table) {
            if (Schema::hasColumn('levelup_questions', 'listening_text')) {
                $table->dropColumn('listening_text');
            }
        });
    }
};
