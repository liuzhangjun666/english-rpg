<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('levelup_mails', function (Blueprint $table) {
            $table->id();
            $table->string('title', 120)->comment('邮件标题');
            $table->text('body')->comment('正文');
            $table->string('type', 30)->default('announce')->comment('类型 announce/reward/notice/system');
            $table->string('sender', 60)->default('宗门')->comment('发件人显示名');
            $table->json('rewards')->nullable()->comment('附件奖励 {spirit_stone,exp,spirit_power,items:[{item_id,quantity}]}');
            $table->string('action', 30)->nullable()->comment('点击动作 signin/dailyQuest/exam');
            $table->boolean('is_broadcast')->default(false)->comment('是否全员广播');
            $table->unsignedBigInteger('target_user_id')->nullable()->comment('定向收件人(非广播时)');
            $table->timestamp('published_at')->nullable()->comment('发布时间, null=立即可见');
            $table->timestamp('expires_at')->nullable()->comment('过期时间, null=永久');
            $table->timestamps();

            $table->index(['is_broadcast', 'published_at', 'expires_at'], 'idx_broadcast_feed');
            $table->index(['target_user_id', 'published_at'], 'idx_target_feed');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('levelup_mails');
    }
};
