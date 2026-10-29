import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' }, // Updated from 8h to 7 days as per spec
    }),
  ],
  providers: [JwtStrategy],
  exports: [JwtModule, JwtStrategy],
})
export class AuthJwtModule {}
