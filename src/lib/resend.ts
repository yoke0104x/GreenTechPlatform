import { Resend } from 'resend';

// 初始化 Resend 客户端
const resend = new Resend(process.env.RESEND_API_KEY || 'dummy-key-for-build');

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

// 邮件模板
export const emailTemplates = {
  resetPassword: (code: string): EmailTemplate => ({
    subject: '重置密码验证码 - 绿色技术平台',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="color: #00b899; margin: 0; font-size: 28px;">绿色技术平台</h1>
            <p style="color: #666; margin-top: 10px; font-size: 16px;">密码重置验证码</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px; text-align: center; margin: 30px 0;">
            <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px;">您的验证码</h2>
            <div style="font-size: 36px; font-weight: bold; color: #00b899; letter-spacing: 8px; padding: 20px; background-color: white; border-radius: 6px; border: 2px dashed #00b899;">
              ${code}
            </div>
            <p style="color: #666; margin-top: 20px; font-size: 14px;">验证码有效期为 5 分钟</p>
          </div>
          
          <div style="margin: 30px 0;">
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              您正在重置绿色技术平台账户的密码。请在重置密码页面输入上述验证码完成身份验证。
            </p>
            <p style="color: #666; font-size: 14px; line-height: 1.6; margin-top: 20px;">
              如果您未申请重置密码，请忽略此邮件。您的账户安全不会受到影响。
            </p>
          </div>
          
          <div style="border-top: 1px solid #eee; margin-top: 40px; padding-top: 20px; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              此邮件由系统自动发送，请勿直接回复。
            </p>
            <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">
              © 2024 绿色技术平台 版权所有
            </p>
          </div>
        </div>
      </div>
    `,
    text: `
绿色技术平台 - 密码重置验证码

您的验证码是：${code}

验证码有效期为 5 分钟。

您正在重置绿色技术平台账户的密码。请在重置密码页面输入上述验证码完成身份验证。

如果您未申请重置密码，请忽略此邮件。您的账户安全不会受到影响。

此邮件由系统自动发送，请勿直接回复。
© 2024 绿色技术平台 版权所有
    `
  }),

  register: (code: string): EmailTemplate => ({
    subject: '注册验证码 - 绿色技术平台',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="color: #00b899; margin: 0; font-size: 28px;">绿色技术平台</h1>
            <p style="color: #666; margin-top: 10px; font-size: 16px;">欢迎注册</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px; text-align: center; margin: 30px 0;">
            <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px;">您的验证码</h2>
            <div style="font-size: 36px; font-weight: bold; color: #00b899; letter-spacing: 8px; padding: 20px; background-color: white; border-radius: 6px; border: 2px dashed #00b899;">
              ${code}
            </div>
            <p style="color: #666; margin-top: 20px; font-size: 14px;">验证码有效期为 5 分钟</p>
          </div>
          
          <div style="margin: 30px 0;">
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              感谢您注册绿色技术平台！请在注册页面输入上述验证码完成邮箱验证。
            </p>
            <p style="color: #666; font-size: 14px; line-height: 1.6; margin-top: 20px;">
              如果您未申请注册，请忽略此邮件。
            </p>
          </div>
          
          <div style="border-top: 1px solid #eee; margin-top: 40px; padding-top: 20px; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              此邮件由系统自动发送，请勿直接回复。
            </p>
            <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">
              © 2024 绿色技术平台 版权所有
            </p>
          </div>
        </div>
      </div>
    `,
    text: `
绿色技术平台 - 注册验证码

您的验证码是：${code}

验证码有效期为 5 分钟。

感谢您注册绿色技术平台！请在注册页面输入上述验证码完成邮箱验证。

如果您未申请注册，请忽略此邮件。

此邮件由系统自动发送，请勿直接回复。
© 2024 绿色技术平台 版权所有
    `
  }),

  login: (code: string): EmailTemplate => ({
    subject: '登录验证码 - 绿色技术平台',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="color: #00b899; margin: 0; font-size: 28px;">绿色技术平台</h1>
            <p style="color: #666; margin-top: 10px; font-size: 16px;">登录验证码</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px; text-align: center; margin: 30px 0;">
            <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px;">您的验证码</h2>
            <div style="font-size: 36px; font-weight: bold; color: #00b899; letter-spacing: 8px; padding: 20px; background-color: white; border-radius: 6px; border: 2px dashed #00b899;">
              ${code}
            </div>
            <p style="color: #666; margin-top: 20px; font-size: 14px;">验证码有效期为 5 分钟</p>
          </div>
          
          <div style="margin: 30px 0;">
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              您正在登录绿色技术平台。请在登录页面输入上述验证码完成身份验证。
            </p>
            <p style="color: #666; font-size: 14px; line-height: 1.6; margin-top: 20px;">
              如果您未尝试登录，请忽略此邮件并检查您的账户安全。
            </p>
          </div>
          
          <div style="border-top: 1px solid #eee; margin-top: 40px; padding-top: 20px; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              此邮件由系统自动发送，请勿直接回复。
            </p>
            <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">
              © 2024 绿色技术平台 版权所有
            </p>
          </div>
        </div>
      </div>
    `,
    text: `
绿色技术平台 - 登录验证码

您的验证码是：${code}

验证码有效期为 5 分钟。

您正在登录绿色技术平台。请在登录页面输入上述验证码完成身份验证。

如果您未尝试登录，请忽略此邮件并检查您的账户安全。

此邮件由系统自动发送，请勿直接回复。
© 2024 绿色技术平台 版权所有
    `
  })
  ,

  bindEmail: (code: string): EmailTemplate => ({
    subject: '绑定邮箱验证码 - 绿色技术平台',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="color: #00b899; margin: 0; font-size: 28px;">绿色技术平台</h1>
            <p style="color: #666; margin-top: 10px; font-size: 16px;">绑定邮箱验证码</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px; text-align: center; margin: 30px 0;">
            <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px;">您的验证码</h2>
            <div style="font-size: 36px; font-weight: bold; color: #00b899; letter-spacing: 8px; padding: 20px; background-color: white; border-radius: 6px; border: 2px dashed #00b899;">
              ${code}
            </div>
            <p style="color: #666; margin-top: 20px; font-size: 14px;">验证码有效期为 5 分钟</p>
          </div>
          
          <div style="margin: 30px 0;">
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              您正在绑定（或修改）绿色技术平台账户邮箱。请在页面中输入上述验证码完成验证。
            </p>
            <p style="color: #666; font-size: 14px; line-height: 1.6; margin-top: 20px;">
              如果您未进行此操作，请忽略此邮件并检查账户安全。
            </p>
          </div>
          
          <div style="border-top: 1px solid #eee; margin-top: 40px; padding-top: 20px; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              此邮件由系统自动发送，请勿直接回复。
            </p>
            <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">
              © 2024 绿色技术平台 版权所有
            </p>
          </div>
        </div>
      </div>
    `,
    text: `
绿色技术平台 - 绑定邮箱验证码

您的验证码是：${code}

验证码有效期为 5 分钟。

您正在绑定（或修改）绿色技术平台账户邮箱。请在页面中输入上述验证码完成验证。

如果您未进行此操作，请忽略此邮件并检查账户安全。

此邮件由系统自动发送，请勿直接回复。
© 2024 绿色技术平台 版权所有
    `
  })
};

// 生成6位数字验证码
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 发送邮件
export async function sendEmail(
  to: string,
  template: EmailTemplate
): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
  try {
    console.log(`开始发送邮件到: ${to}`);
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@greendev.org.cn',
      to: [to],
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    console.log(`邮件发送结果:`, result);

    if (result.error) {
      console.error(`邮件发送失败:`, result.error);
      return {
        success: false,
        error: result.error.message
      };
    }

    console.log(`邮件发送成功: ID=${result.data?.id}`);
    return {
      success: true,
      data: result.data
    };
  } catch (error) {
    console.error(`邮件发送异常:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '发送邮件失败'
    };
  }
}

// 发送重置密码验证码
export async function sendResetPasswordCode(email: string): Promise<{
  success: boolean;
  code?: string;
  data?: { id: string };
  error?: string;
}> {
  const code = generateOTP();
  console.log(`生成重置密码验证码: email=${email}, code=${code}`);
  
  const template = emailTemplates.resetPassword(code);
  const result = await sendEmail(email, template);
  
  if (result.success) {
    console.log(`重置密码验证码发送成功: email=${email}, code=${code}`);
    return {
      success: true,
      code, // 返回验证码供后端存储
      data: result.data
    };
  } else {
    console.error(`重置密码验证码发送失败: email=${email}, error=${result.error}`);
    return {
      success: false,
      error: result.error
    };
  }
}

// 发送注册验证码
export async function sendRegisterCode(email: string): Promise<{
  success: boolean;
  code?: string;
  data?: { id: string };
  error?: string;
}> {
  const code = generateOTP();
  const template = emailTemplates.register(code);
  
  const result = await sendEmail(email, template);
  
  if (result.success) {
    return {
      success: true,
      code, // 返回验证码供后端存储
      data: result.data
    };
  } else {
    return {
      success: false,
      error: result.error
    };
  }
}

// 发送登录验证码
export async function sendLoginCode(email: string): Promise<{
  success: boolean;
  code?: string;
  data?: { id: string };
  error?: string;
}> {
  const code = generateOTP();
  const template = emailTemplates.login(code);
  
  const result = await sendEmail(email, template);
  
  if (result.success) {
    return {
      success: true,
      code, // 返回验证码供后端存储
      data: result.data
    };
  } else {
    return {
      success: false,
      error: result.error
    };
  }
}

// 发送绑定邮箱验证码
export async function sendBindEmailCode(email: string): Promise<{
  success: boolean;
  code?: string;
  data?: { id: string };
  error?: string;
}> {
  const code = generateOTP();
  const template = emailTemplates.bindEmail(code);
  
  const result = await sendEmail(email, template);
  
  if (result.success) {
    return {
      success: true,
      code,
      data: result.data
    };
  } else {
    return {
      success: false,
      error: result.error
    };
  }
}

export { resend };
