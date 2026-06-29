<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('levelup_recharge_products', function (Blueprint $table) {
            $table->id();
            $table->string('product_key', 50)->unique();
            $table->string('name', 100);
            $table->string('description', 255)->nullable();
            $table->string('category', 32); // jade_pack | vip_monthly | vip_yearly
            $table->unsignedInteger('price_cents');
            $table->unsignedInteger('jade_amount')->default(0);
            $table->unsignedInteger('bonus_jade')->default(0);
            $table->unsignedSmallInteger('vip_days')->default(0);
            $table->string('vip_type', 16)->nullable();
            $table->json('payload')->nullable();
            $table->json('limits')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('levelup_recharge_orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_no', 32)->unique();
            $table->foreignId('user_id')->constrained('levelup_users');
            $table->string('product_key', 50);
            $table->unsignedInteger('amount_cents');
            $table->string('currency', 8)->default('CNY');
            $table->string('status', 16)->default('pending'); // pending|paid|failed|refunded|closed
            $table->string('pay_channel', 16)->nullable();
            $table->string('provider_trade_no', 64)->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->json('client_meta')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index('provider_trade_no');
        });

        Schema::create('levelup_jade_ledger', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('levelup_users');
            $table->integer('delta');
            $table->unsignedInteger('balance_after');
            $table->string('source_type', 32);
            $table->string('source_id', 64)->nullable();
            $table->string('remark', 255)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('levelup_jade_ledger');
        Schema::dropIfExists('levelup_recharge_orders');
        Schema::dropIfExists('levelup_recharge_products');
    }
};
