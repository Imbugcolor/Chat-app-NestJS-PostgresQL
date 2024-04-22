import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TwilioService } from 'nestjs-twilio';
import { VerificationCheckResponse } from './types/verify-reponse.type';
import { MailService } from 'src/mail/mail.service';
import { RedisService } from 'src/redis/redis.service';
import * as otpGenerator from 'otp-generator';
import * as bcryptjs from 'bcryptjs';

@Injectable()
export class OtpService {
  public constructor(
    private readonly twilioService: TwilioService,
    private configService: ConfigService,
    private mailService: MailService,
    private redisService: RedisService,
  ) {}

  async sendOtpSMS(phone: string) {
    return this.twilioService.client.verify.v2
      .services(this.configService.get('TWILIO_SERVICE_SID'))
      .verifications.create({
        to: phone,
        channel: 'sms',
      });
  }

  async verifyOtpSMS(phone: string, code: string) {
    try {
      const verifyCheck: VerificationCheckResponse = await new Promise(
        (resolve, reject) => {
          return this.twilioService.client.verify.v2
            .services(this.configService.get('TWILIO_SERVICE_SID'))
            .verificationChecks.create(
              {
                to: phone,
                code,
              },
              (error, result) => {
                if (error) {
                  console.error('Error checking OTP:', error);
                  reject(error);
                } else {
                  console.log('Verification Check SID:', result.sid);
                  resolve(result);
                }
              },
            );
        },
      );
      return verifyCheck;
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  async sendOtpMail(email: string) {
    try {
      const otp = otpGenerator.generate(6, {
        lowerCaseAlphabets: false,
        upperCaseAlphabets: false,
        specialChars: false,
      });

      const ttl = 5 * 60 * 1000; //5 Minutes in miliseconds
      const expires = Date.now() + ttl; //timestamp to 5 minutes in the future

      const salt = await bcryptjs.genSalt();
      const hashOtp = await bcryptjs.hash(otp, salt);

      const fullHash = `${hashOtp}-${expires}`;

      await this.redisService.setOtp(email, fullHash);

      this.mailService.sendVerifyMail(
        email,
        otp,
        'Activate your LetChat account, it will expire in 5 minutes.',
      );

      return otp;
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  async verifyOtpMail(email: string, otp: string) {
    try {
      const otpHash = await this.redisService.getOtp(email);

      if (!otpHash) {
        throw new BadRequestException('OTP verified failed.');
      }
      const [otpValue, expires] = otpHash.split('-');
      const now = Date.now();
      if (now > parseInt(expires)) {
        throw new BadRequestException('OTP has expired.');
      }
      if (await bcryptjs.compare(otp, otpValue)) {
        await this.redisService.delKey(email);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      throw new BadRequestException(error);
    }
  }
}
