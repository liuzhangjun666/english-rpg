<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('wanyao_tower_progress', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->primary();
            $table->unsignedInteger('current_floor')->default(1);
            $table->unsignedInteger('highest_floor')->default(0);
            $table->unsignedBigInteger('current_run_id')->nullable();
            $table->timestamps();
            $table->foreign('user_id')->references('id')->on('levelup_users')->onDelete('cascade');
        });
    }
    public function down(): void { Schema::dropIfExists('wanyao_tower_progress'); }
};
