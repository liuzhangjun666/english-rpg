<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('levelup_user_mails', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('mail_id');
            $table->timestamp('read_at')->nullable()->comment('已读时间');
            $table->timestamp('claimed_at')->nullable()->comment('附件奖励领取时间');
            $table->timestamps();

            $table->unique(['user_id', 'mail_id'], 'uk_user_mail');
            $table->index(['user_id', 'read_at'], 'idx_user_unread');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('levelup_user_mails');
    }
};
