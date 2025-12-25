import { NextRequest, NextResponse } from 'next/server';
import { searchCompanies, formatCompanyInfo } from '@/api/qichacha';

// 强制动态渲染
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const lookupEnabled = process.env.NEXT_PUBLIC_COMPANY_LOOKUP_ENABLED !== 'false'
    if (!lookupEnabled) {
      return NextResponse.json({
        success: true,
        data: [],
        total: 0,
        disabled: true,
      })
    }

    const { searchParams } = new URL(request.url);
    const searchKey = searchParams.get('q');

    if (!searchKey) {
      return NextResponse.json(
        { 
          success: false, 
          error: '搜索关键字不能为空' 
        },
        { status: 400 }
      );
    }

    if (searchKey.length < 2) {
      return NextResponse.json(
        { 
          success: false, 
          error: '搜索关键字至少需要2个字符' 
        },
        { status: 400 }
      );
    }

    // 调用企查查API搜索企业
    const result = await searchCompanies(searchKey);

    if (!result.success) {
      const errMsg = result.error || ''
      // 业务约定：当企查查返回状态码201（未找到匹配企业）时，转发为HTTP 201
      // 供前端触发“手动输入企业名称”的交互
      if (/未找到匹配|状态码\s*:\s*201/.test(errMsg)) {
        return NextResponse.json(
          { success: false, error: '未找到匹配的企业信息' },
          { status: 201 }
        )
      }

      return NextResponse.json(
        { 
          success: false, 
          error: errMsg || '企业搜索失败' 
        },
        { status: 500 }
      );
    }

    // 格式化返回数据
    const companies = result.data?.map(formatCompanyInfo) || [];

    return NextResponse.json({
      success: true,
      data: companies,
      total: companies.length,
    });

  } catch (error) {
    console.error('企业搜索API错误:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '服务器内部错误' 
      },
      { status: 500 }
    );
  }
}
