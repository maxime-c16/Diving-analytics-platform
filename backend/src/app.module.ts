import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ScoresModule } from "./modules/scores/scores.module";

@Module({
  imports: [ScoresModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
