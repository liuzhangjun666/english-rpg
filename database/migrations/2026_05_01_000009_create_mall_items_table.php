<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('levelup_mall_items', function (Blueprint $table) {
            $table->id();
            $table->string('item_id', 50)->unique(); // spirit_potion, exp_boost, streak_freeze, title_scroll, herb_bundle
            $table->string('name', 100);
            $table->string('description', 255);
            $table->string('category', 50);         // consumable, boost, title
            $table->integer('price_stones');
            $table->string('icon', 100)->nullable();
            $table->json('effect')->nullable();      // JSON: {type, value, duration}
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('levelup_user_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('levelup_users');
            $table->string('item_id', 50);
            $table->integer('quantity')->default(1);
            $table->timestamp('purchased_at')->useCurrent();
            $table->timestamp('expires_at')->nullable();
        });
    }

    public function down(): void {
        Schema::dropIfExists('levelup_user_items');
        Schema::dropIfExists('levelup_mall_items');
    }
};
