'use client'

import { useEffect, useState } from 'react'
import type { User } from '@/api/supabaseAuth'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ImageUpload } from '@/components/admin/forms/image-upload'
import { useAuthContext } from '@/components/auth/auth-provider'
import { isValidEmail, isValidPhone, emailError, phoneError } from '@/lib/validators'
import { profileApi } from '@/api/profile'

interface BasicInfoProps {
  locale: string
}

export default function BasicInfo({ locale }: BasicInfoProps) {
  const { user: authUser, loading: authLoading, checkUser } = useAuthContext()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false)
  const [isPhoneDialogOpen, setIsPhoneDialogOpen] = useState(false)
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [phoneCode, setPhoneCode] = useState('')
  const [isEmailCodeSent, setIsEmailCodeSent] = useState(false)
  const [isPhoneCodeSent, setIsPhoneCodeSent] = useState(false)
  const [emailCountdown, setEmailCountdown] = useState(0)
  const [phoneCountdown, setPhoneCountdown] = useState(0)

  useEffect(() => {
    if (!authLoading) {
      console.log('🔍 个人中心加载用户信息:', authUser)
      
      if (authUser) {
        // 转换AuthContext用户信息为BasicInfo需要的格式
        const basicInfoUser: User = {
          id: authUser.id,
          email: authUser.email || undefined,
          phone: authUser.phone || undefined,
          name: authUser.name || (locale === 'en' ? 'User' : '用户'),
          avatar: authUser.avatar_url || undefined,
          role: 'user', // AuthContext没有role信息，默认为user
          createdAt: new Date().toISOString(), // AuthContext没有createdAt，使用当前时间
          emailVerified: !!authUser.email, // 简单判断
          phoneVerified: !!authUser.phone  // 简单判断
        }
        setUser(basicInfoUser)
        console.log('✅ 用户信息已设置:', basicInfoUser)
      } else {
        setUser(null)
      }
      setIsLoading(false)
    }
  }, [authUser, authLoading, locale])

  // 发送邮箱验证码
  const sendEmailCode = async () => {
    if (!isValidEmail(newEmail)) {
      alert(emailError(locale as 'en' | 'zh'))
      return
    }
    const resp = await profileApi.sendBindEmailCode(newEmail)
    if (!resp.success) {
      alert(resp.error || (locale === 'en' ? 'Failed to send code' : '发送验证码失败'))
      return
    }
    setIsEmailCodeSent(true)
    
    // 开始倒计时
    setEmailCountdown(60)
    const timer = setInterval(() => {
      setEmailCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // 发送手机验证码
  const sendPhoneCode = async () => {
    if (!isValidPhone(newPhone, '+86')) {
      alert(phoneError(locale as 'en' | 'zh'))
      return
    }
    const resp = await profileApi.sendBindPhoneCode({ phone: newPhone, countryCode: '+86' })
    if (!resp.success) {
      alert(resp.error || (locale === 'en' ? 'Failed to send code' : '发送验证码失败'))
      return
    }
    setIsPhoneCodeSent(true)
    
    // 开始倒计时
    setPhoneCountdown(60)
    const timer = setInterval(() => {
      setPhoneCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // 确认修改邮箱
  const handleConfirmEmailChange = async () => {
    try {
      if (!isValidEmail(newEmail)) {
        alert(emailError(locale as 'en' | 'zh'))
        return
      }
      if (!emailCode) {
        alert(locale === 'en' ? 'Please enter verification code' : '请输入验证码')
        return
      }
      const resp = await profileApi.confirmBindEmail({ email: newEmail, code: emailCode })
      if (!resp.success) {
        const attemptsLeft = (resp as any).attemptsLeft
        const msg = attemptsLeft != null
          ? `${resp.error || (locale === 'en' ? 'Verification failed' : '验证失败')}（${locale === 'en' ? 'Attempts left' : '剩余次数'}: ${attemptsLeft}）`
          : (resp.error || (locale === 'en' ? 'Verification failed' : '验证失败'))
        alert(msg)
        return
      }

      await checkUser()
      setIsEmailDialogOpen(false)
      setNewEmail('')
      setEmailCode('')
      setIsEmailCodeSent(false)
      setEmailCountdown(0)
    } catch (error) {
      console.error('修改邮箱失败:', error)
      alert(locale === 'en' ? 'Operation failed' : '操作失败')
    }
  }

  // 确认修改手机号
  const handleConfirmPhoneChange = async () => {
    try {
      if (!isValidPhone(newPhone, '+86')) {
        alert(phoneError(locale as 'en' | 'zh'))
        return
      }
      if (!phoneCode) {
        alert(locale === 'en' ? 'Please enter verification code' : '请输入验证码')
        return
      }
      const resp = await profileApi.confirmBindPhone({ phone: newPhone, code: phoneCode, countryCode: '+86' })
      if (!resp.success) {
        const attemptsLeft = (resp as any).attemptsLeft
        const msg = attemptsLeft != null
          ? `${resp.error || (locale === 'en' ? 'Verification failed' : '验证失败')}（${locale === 'en' ? 'Attempts left' : '剩余次数'}: ${attemptsLeft}）`
          : (resp.error || (locale === 'en' ? 'Verification failed' : '验证失败'))
        alert(msg)
        return
      }

      await checkUser()
      setIsPhoneDialogOpen(false)
      setNewPhone('')
      setPhoneCode('')
      setIsPhoneCodeSent(false)
      setPhoneCountdown(0)
    } catch (error) {
      console.error('修改手机号失败:', error)
      alert(locale === 'en' ? 'Operation failed' : '操作失败')
    }
  }

  // 头像更换处理
  const handleAvatarChange = async (newAvatarUrl: string) => {
    try {
      const resp = await profileApi.updateAvatar(newAvatarUrl)
      if (!resp.success) {
        alert(resp.error || (locale === 'en' ? 'Failed to update avatar' : '更换头像失败'))
        return
      }
      if (user) {
        setUser({ ...user, avatar: newAvatarUrl })
      }
      await checkUser()
      setIsAvatarDialogOpen(false)
    } catch (error) {
      console.error('更换头像失败:', error)
      alert(locale === 'en' ? 'Operation failed' : '操作失败')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[150px]" />
            <Skeleton className="h-4 w-[100px]" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    )
  }

  if (!user) {
    return <div>{locale === 'en' ? 'User not found' : '未找到用户信息'}</div>
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-6">
        {locale === 'en' ? 'Basic Information' : '基本信息'}
      </h3>
      
      {/* 头像部分 */}
      <div className="flex items-center space-x-4 mb-6">
        <Avatar className="w-16 h-16">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback>{user.name?.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <Dialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-[#00b899] hover:bg-[#009a7a] text-white">
              {locale === 'en' ? 'Change Avatar' : '更换头像'}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {locale === 'en' ? 'Change Avatar' : '更换头像'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <ImageUpload
                value={user.avatar || ''}
                onChange={handleAvatarChange}
                bucket="images"
                folder="avatars"
                placeholder={locale === 'en' ? 'Click to upload avatar' : '点击上传头像'}
                className="w-full"
                maxSize={2}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsAvatarDialogOpen(false)}>
                  {locale === 'en' ? 'Cancel' : '取消'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="username">
            {locale === 'en' ? 'Username' : '用户名'}
          </Label>
          <Input id="username" value={user.name} disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">
            {locale === 'en' ? 'Email' : '邮箱'}
          </Label>
          <div className="flex gap-2">
            <Input id="email" type="email" value={user.email || ''} disabled className="flex-1" />
            <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-[#00b899] hover:bg-[#009a7a] text-white">
                  {locale === 'en' ? 'Modify' : '修改'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {locale === 'en' ? 'Change Email' : '修改邮箱'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-email">
                      {locale === 'en' ? 'New Email Address' : '新邮箱地址'}
                    </Label>
                    <Input
                      id="new-email"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder={locale === 'en' ? 'Enter new email address' : '请输入新的邮箱地址'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-code">
                      {locale === 'en' ? 'Verification Code' : '验证码'}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="email-code"
                        value={emailCode}
                        onChange={(e) => setEmailCode(e.target.value)}
                        placeholder={locale === 'en' ? 'Enter verification code' : '请输入验证码'}
                        className="flex-1"
                      />
                      <Button 
                        size="sm"
                        onClick={sendEmailCode}
                        disabled={!newEmail || emailCountdown > 0}
                        className="bg-[#00b899] hover:bg-[#009a7a] text-white disabled:opacity-50"
                      >
                        {emailCountdown > 0 ? `${emailCountdown}s` : (locale === 'en' ? 'Send Code' : '发送验证码')}
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)}>
                      {locale === 'en' ? 'Cancel' : '取消'}
                    </Button>
                    <Button onClick={handleConfirmEmailChange} disabled={!newEmail || !emailCode} className="bg-[#00b899] hover:bg-[#009a7a] text-white">
                      {locale === 'en' ? 'Confirm Change' : '确认修改'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">
            {locale === 'en' ? 'Phone Number' : '手机号'}
          </Label>
          <div className="flex gap-2">
            <Input id="phone" type="tel" value={user.phone || ''} disabled className="flex-1" />
            <Dialog open={isPhoneDialogOpen} onOpenChange={setIsPhoneDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-[#00b899] hover:bg-[#009a7a] text-white">
                  {locale === 'en' ? 'Modify' : '修改'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {locale === 'en' ? 'Change Phone Number' : '修改手机号'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-phone">
                      {locale === 'en' ? 'New Phone Number' : '新手机号'}
                    </Label>
                    <Input
                      id="new-phone"
                      type="tel"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder={locale === 'en' ? 'Enter new phone number' : '请输入新的手机号'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone-code">
                      {locale === 'en' ? 'Verification Code' : '验证码'}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="phone-code"
                        value={phoneCode}
                        onChange={(e) => setPhoneCode(e.target.value)}
                        placeholder={locale === 'en' ? 'Enter verification code' : '请输入验证码'}
                        className="flex-1"
                      />
                      <Button 
                        size="sm"
                        onClick={sendPhoneCode}
                        disabled={!newPhone || phoneCountdown > 0}
                        className="bg-[#00b899] hover:bg-[#009a7a] text-white disabled:opacity-50"
                      >
                        {phoneCountdown > 0 ? `${phoneCountdown}s` : (locale === 'en' ? 'Send Code' : '发送验证码')}
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setIsPhoneDialogOpen(false)}>
                      {locale === 'en' ? 'Cancel' : '取消'}
                    </Button>
                    <Button onClick={handleConfirmPhoneChange} disabled={!newPhone || !phoneCode} className="bg-[#00b899] hover:bg-[#009a7a] text-white">
                      {locale === 'en' ? 'Confirm Change' : '确认修改'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  )
}
