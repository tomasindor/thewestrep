import { NextResponse } from 'next/server';
import { db } from '@/lib/db'; // TODO: Fix this import
import MercadoPago from 'mercadopago';

const mp = new MercadoPago({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || ''
});

async function validateSignature(request: Request): Promise<boolean> {
  const signature = request.headers.get('x-signature');
  const body = await request.text();

  if (!signature) return false;

  const expectedSignature = require('crypto')
    .createHmac('sha256', process.env.MERCADOPAGO_WEBHOOK_SECRET || '')
    .update(body)
    .digest('hex');

  return signature === expectedSignature;
}

export async function POST(request: Request) {
  if (!await validateSignature(request)) {
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { type, data } = body;

    switch (type) {
      case 'payment.created':
      case 'payment.failed':
      case 'payment.refunded':
        await db.paymentEvents.create({
          data: {
            eventType: type,
            paymentId: data.id,
            status: data.status,
            amount: data.transaction_amount,
            currency: data.currency_id
          }
        });

        // Actualizar estado de la orden
        await db.order.update({
          where: { id: data.external_reference },
          data: { status: data.status }
        });

        // Enviar notificación por email (si RESEND_API_KEY está configurado)
        if (process.env.RESEND_API_KEY) {
          // Lógica para enviar email
        }

        break;
      default:
        console.log(`Evento no manejado: ${type}`);
    }

    return NextResponse.json({ status: 'processed' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}