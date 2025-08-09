import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const baseUrl = req.nextUrl.origin;
    
    // Send via email first
    const emailResponse = await fetch(`${baseUrl}/api/tagihan/${params.id}/send`, {
      method: 'POST',
    });
    
    const emailResult = await emailResponse.json();
    
    // Send via WhatsApp
    const whatsappResponse = await fetch(`${baseUrl}/api/tagihan/${params.id}/send-whatsapp`, {
      method: 'POST',
    });
    
    const whatsappResult = await whatsappResponse.json();
    
    // Determine overall success
    const emailSuccess = emailResponse.ok && emailResult.message;
    const whatsappSuccess = whatsappResponse.ok && whatsappResult.success;
    
    if (emailSuccess && whatsappSuccess) {
      return NextResponse.json({
        success: true,
        message: "Tagihan berhasil dikirim melalui email dan WhatsApp",
        email: {
          success: true,
          message: emailResult.message,
          emailId: emailResult.emailId
        },
        whatsapp: {
          success: true,
          message: whatsappResult.message,
          messageId: whatsappResult.whatsappMessageId
        }
      });
    } else if (emailSuccess && !whatsappSuccess) {
      return NextResponse.json({
        success: true,
        message: "Tagihan berhasil dikirim melalui email, tetapi gagal dikirim via WhatsApp",
        email: {
          success: true,
          message: emailResult.message,
          emailId: emailResult.emailId
        },
        whatsapp: {
          success: false,
          error: whatsappResult.error
        }
      });
    } else if (!emailSuccess && whatsappSuccess) {
      return NextResponse.json({
        success: true,
        message: "Tagihan berhasil dikirim via WhatsApp, tetapi gagal dikirim melalui email",
        email: {
          success: false,
          error: emailResult.error
        },
        whatsapp: {
          success: true,
          message: whatsappResult.message,
          messageId: whatsappResult.whatsappMessageId
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: "Gagal mengirim tagihan melalui email dan WhatsApp",
        email: {
          success: false,
          error: emailResult.error
        },
        whatsapp: {
          success: false,
          error: whatsappResult.error
        }
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Send both channels error:", error);
    return NextResponse.json({
      success: false,
      error: `Gagal mengirim tagihan: ${error.message}`
    }, { status: 500 });
  }
}