<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('levelup_sms_codes', function (Blueprint $table) {
            $table->id();
            $table->string('phone', 11)->index();
            $table->string('code', 6);
            $table->string('action', 20)->default('login'); // login / register / bind
            $table->timestamp('expires_at');
            $table->timestamp('used_at')->nullable();
            $table->integer('attempts')->default(0); // 已验证次数（防暴力）
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('levelup_sms_codes');
    }
};
