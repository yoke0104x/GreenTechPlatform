'use client';

import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuthContext } from '@/components/auth/auth-provider';
import { Mail, Phone, User, MessageSquare, Send, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { createContactMessage } from '@/lib/supabase/contact-messages';
import { isValidEmail, isValidPhone } from '@/lib/validators';

interface ContactUsModalProps {
  isOpen: boolean;
  onClose: () => void;
  technologyId?: string;
  technologyName?: string;
  companyName?: string;
  locale?: string;
  /**
   * 消息分类：
   * - 技术对接（默认）
   * - 用户反馈
   * - 园区对接（园区详情页使用）
   * - 政策咨询（政策详情页使用）
   */
  category?: '技术对接' | '用户反馈' | '园区对接' | '政策咨询';
  /**
   * 来源标记，便于后端兜底分类，例如 'park' | 'tech' | 'policy'
   */
  source?: string;
}

interface ContactFormData {
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  message: string;
}

export function ContactUsModal({ 
  isOpen, 
  onClose, 
  technologyId, 
  technologyName, 
  companyName,
  locale = 'zh',
  category,
  source,
}: ContactUsModalProps) {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Translation constants
  const translations = {
    zh: {
      contactUs: '联系我们',
      aboutTechnology: '关于技术：',
      contactName: '联系人姓名',
      contactPhone: '联系电话',
      contactEmail: '联系邮箱',
      message: '留言内容',
      required: '*',
      cancel: '取消',
      submit: '提交留言',
      submitting: '提交中...',
      placeholders: {
        name: '请输入您的姓名',
        phone: '请输入您的联系电话',
        email: '请输入您的邮箱地址',
        message: '请详细描述您的需求或问题...'
      },
      validation: {
        title: '验证失败',
        nameRequired: '请填写联系人姓名',
        phoneRequired: '请填写联系电话',
        emailRequired: '请填写联系邮箱',
        emailFormat: '请填写正确的邮箱格式',
        messageRequired: '请填写留言内容'
      },
      submitError: '提交失败',
      loginRequired: '请先登录后再联系我们',
      submitSuccess: '提交成功',
      successMessage: '您的留言已成功提交，我们会尽快与您联系！',
      errorMessage: '提交失败，请稍后重试'
    },
    en: {
      contactUs: 'Contact Us',
      aboutTechnology: 'About Technology: ',
      contactName: 'Contact Name',
      contactPhone: 'Phone Number',
      contactEmail: 'Email Address',
      message: 'Message',
      required: '*',
      cancel: 'Cancel',
      submit: 'Submit Message',
      submitting: 'Submitting...',
      placeholders: {
        name: 'Please enter your name',
        phone: 'Please enter your phone number',
        email: 'Please enter your email address',
        message: 'Please describe your needs or questions in detail...'
      },
      validation: {
        title: 'Validation Failed',
        nameRequired: 'Please fill in contact name',
        phoneRequired: 'Please fill in phone number',
        emailRequired: 'Please fill in email address',
        emailFormat: 'Please enter a valid email format',
        messageRequired: 'Please fill in message content'
      },
      submitError: 'Submission Failed',
      loginRequired: 'Please login first to contact us',
      submitSuccess: 'Submitted Successfully',
      successMessage: 'Your message has been submitted successfully, we will contact you soon!',
      errorMessage: 'Submission failed, please try again later'
    }
  };

  const t = translations[locale as keyof typeof translations] || translations.zh;
  const isPolicyContext = category === '政策咨询' || source === 'policy';
  const isParkContext = category === '园区对接' || source === 'park';
  const subjectPrefix =
    locale === 'en'
      ? isPolicyContext
        ? 'About Policy: '
        : isParkContext
        ? 'About Park: '
        : t.aboutTechnology
      : isPolicyContext
      ? '关于政策：'
      : isParkContext
      ? '关于园区：'
      : t.aboutTechnology;
  const [formData, setFormData] = useState<ContactFormData>({
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    message: ''
  });

  // 当用户信息可用时，自动填充表单
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        contactName: user.name || '',
        contactPhone: user.phone || '',
        contactEmail: user.email || ''
      }));
    }
  }, [user]);

  // 处理表单输入变化
  const handleInputChange = (field: keyof ContactFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 表单验证
  const validateForm = (): boolean => {
    if (!formData.contactName.trim()) {
      toast({
        title: t.validation.title,
        description: t.validation.nameRequired,
        variant: "destructive"
      });
      return false;
    }

    if (!formData.contactPhone.trim()) {
      toast({
        title: t.validation.title, 
        description: t.validation.phoneRequired,
        variant: "destructive"
      });
      return false;
    }

    if (!formData.contactEmail.trim()) {
      toast({
        title: t.validation.title,
        description: t.validation.emailRequired, 
        variant: "destructive"
      });
      return false;
    }

    // 邮箱格式验证
    if (!isValidEmail(formData.contactEmail)) {
      toast({
        title: t.validation.title,
        description: t.validation.emailFormat,
        variant: "destructive"
      });
      return false;
    }

    // 手机号格式验证（默认+86）
    if (!isValidPhone(formData.contactPhone, '+86')) {
      toast({
        title: t.validation.title,
        description: locale === 'en' ? 'Please enter a valid phone number' : '请输入正确的手机号码',
        variant: 'destructive'
      })
      return false
    }

    if (!formData.message.trim()) {
      toast({
        title: t.validation.title,
        description: t.validation.messageRequired,
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: t.submitError,
        description: t.loginRequired,
        variant: "destructive"
      });
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // 调用Supabase API创建联系消息
      await createContactMessage({
        technology_id: technologyId,
        technology_name: technologyName,
        company_name: companyName,
        contact_name: formData.contactName,
        contact_phone: formData.contactPhone,
        contact_email: formData.contactEmail,
        message: formData.message,
        // 默认仍归为“技术对接”，园区详情页等可通过 props 显式传入“园区对接”等分类
        category: category ?? '技术对接',
        source,
      });

      toast({
        title: t.submitSuccess,
        description: t.successMessage,
        variant: "default"
      });

      // 重置表单
      setFormData({
        contactName: user.name || '',
        contactPhone: user.phone || '',
        contactEmail: user.email || '',
        message: ''
      });

      onClose();
    } catch (error) {
      console.error('提交联系消息失败:', error);
      const errorMessage = error instanceof Error ? error.message : t.errorMessage;
      toast({
        title: t.submitError,
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // 取消操作
  const handleCancel = () => {
    // 重置表单
    setFormData({
      contactName: user?.name || '',
      contactPhone: user?.phone || '',
      contactEmail: user?.email || '',
      message: ''
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <MessageSquare className="w-5 h-5 text-green-600" />
            {t.contactUs}
          </DialogTitle>
          {technologyName && (
            <p className="text-sm text-gray-600 mt-2">
              {subjectPrefix}
              <span className="font-medium">{technologyName}</span>
              {companyName && <span className="text-gray-500"> - {companyName}</span>}
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 联系人姓名 */}
          <div className="space-y-2">
            <Label htmlFor="contactName" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {t.contactName} <span className="text-red-500">{t.required}</span>
            </Label>
            <Input
              id="contactName"
              type="text"
              placeholder={t.placeholders.name}
              value={formData.contactName}
              onChange={(e) => handleInputChange('contactName', e.target.value)}
              required
            />
          </div>

          {/* 联系电话 */}
          <div className="space-y-2">
            <Label htmlFor="contactPhone" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              {t.contactPhone} <span className="text-red-500">{t.required}</span>
            </Label>
            <Input
              id="contactPhone"
              type="tel"
              placeholder={t.placeholders.phone}
              value={formData.contactPhone}
              onChange={(e) => handleInputChange('contactPhone', e.target.value)}
              required
            />
          </div>

          {/* 联系邮箱 */}
          <div className="space-y-2">
            <Label htmlFor="contactEmail" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {t.contactEmail} <span className="text-red-500">{t.required}</span>
            </Label>
            <Input
              id="contactEmail"
              type="email"
              placeholder={t.placeholders.email}
              value={formData.contactEmail}
              onChange={(e) => handleInputChange('contactEmail', e.target.value)}
              required
            />
          </div>

          {/* 留言内容 */}
          <div className="space-y-2">
            <Label htmlFor="message" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              {t.message} <span className="text-red-500">{t.required}</span>
            </Label>
            <Textarea
              id="message"
              placeholder={t.placeholders.message}
              value={formData.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              rows={4}
              className="resize-none"
              required
            />
          </div>

          {/* 按钮区域 */}
          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              {t.cancel}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Send className="w-4 h-4" />
              {loading ? t.submitting : t.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
