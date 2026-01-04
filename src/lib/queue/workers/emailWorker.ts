/**
 * Email Worker
 *
 * Processes email sending jobs using Resend
 */

import { Job } from 'bullmq'
import { Resend } from 'resend'
import { EmailJobData } from '../queues'
import { createWorker, QUEUE_NAMES } from '../config'

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Email templates
 */
const EMAIL_TEMPLATES = {
  WELCOME: {
    subject: 'Welcome to Tightship PMS',
    from: 'Tightship <noreply@tightship.io>',
  },
  SYNC_COMPLETE: {
    subject: 'Menu Sync Complete',
    from: 'Tightship <noreply@tightship.io>',
  },
  SYNC_FAILED: {
    subject: 'Menu Sync Failed',
    from: 'Tightship <noreply@tightship.io>',
  },
  DUNNING: {
    subject: 'Payment Required - Update Your Payment Method',
    from: 'Tightship Billing <billing@tightship.io>',
  },
  INVOICE: {
    subject: 'Your Tightship Invoice',
    from: 'Tightship Billing <billing@tightship.io>',
  },
} as const

/**
 * Process email job
 */
async function processEmail(job: Job<EmailJobData>) {
  const { to, template, data, subject: customSubject } = job.data

  console.log(`[EmailWorker] Sending ${template} email to ${to}`)

  await job.updateProgress(10)

  try {
    const templateConfig = EMAIL_TEMPLATES[template]

    if (!templateConfig) {
      throw new Error(`Unknown email template: ${template}`)
    }

    await job.updateProgress(30)

    // Import React Email components dynamically
    const { renderEmail } = await getEmailTemplate(template, data)

    await job.updateProgress(50)

    // Send email using Resend
    const result = await resend.emails.send({
      from: templateConfig.from,
      to,
      subject: customSubject || templateConfig.subject,
      html: renderEmail,
    })

    await job.updateProgress(100)

    console.log(`[EmailWorker] Email sent successfully:`, result)

    return {
      success: true,
      emailId: result.id,
      to,
      template,
    }
  } catch (error) {
    console.error(`[EmailWorker] Failed to send email:`, error)
    throw error
  }
}

/**
 * Get email template and render it
 */
async function getEmailTemplate(template: EmailJobData['template'], data: Record<string, unknown>) {
  switch (template) {
    case 'WELCOME':
      return renderWelcomeEmail(data)
    case 'SYNC_COMPLETE':
      return renderSyncCompleteEmail(data)
    case 'SYNC_FAILED':
      return renderSyncFailedEmail(data)
    case 'DUNNING':
      return renderDunningEmail(data)
    case 'INVOICE':
      return renderInvoiceEmail(data)
    default:
      throw new Error(`Unknown template: ${template}`)
  }
}

/**
 * Render welcome email
 */
async function renderWelcomeEmail(data: Record<string, unknown>) {
  const { render } = await import('@react-email/render')
  const { WelcomeEmail } = await import('@/emails/WelcomeEmail')

  const renderEmail = render(WelcomeEmail({
    userName: data.userName as string,
    organizationName: data.organizationName as string,
  }))

  return { renderEmail }
}

/**
 * Render sync complete email
 */
async function renderSyncCompleteEmail(data: Record<string, unknown>) {
  const { render } = await import('@react-email/render')
  const { SyncCompleteEmail } = await import('@/emails/SyncCompleteEmail')

  const renderEmail = render(SyncCompleteEmail({
    restaurantName: data.restaurantName as string,
    platformName: data.platformName as string,
    categoriesUploaded: data.categoriesUploaded as number,
    itemsUploaded: data.itemsUploaded as number,
    syncedAt: data.syncedAt as string,
  }))

  return { renderEmail }
}

/**
 * Render sync failed email
 */
async function renderSyncFailedEmail(data: Record<string, unknown>) {
  const { render } = await import('@react-email/render')
  const { SyncFailedEmail } = await import('@/emails/SyncFailedEmail')

  const renderEmail = render(SyncFailedEmail({
    restaurantName: data.restaurantName as string,
    platformName: data.platformName as string,
    errorMessage: data.errorMessage as string,
    failedAt: data.failedAt as string,
  }))

  return { renderEmail }
}

/**
 * Render dunning email
 */
async function renderDunningEmail(data: Record<string, unknown>) {
  const { render } = await import('@react-email/render')
  const { DunningEmail } = await import('@/emails/DunningEmail')

  const renderEmail = render(DunningEmail({
    organizationName: data.organizationName as string,
    amountDue: data.amountDue as number,
    dueDate: data.dueDate as string,
    invoiceUrl: data.invoiceUrl as string,
    updatePaymentUrl: data.updatePaymentUrl as string,
    attemptNumber: data.attemptNumber as number,
  }))

  return { renderEmail }
}

/**
 * Render invoice email
 */
async function renderInvoiceEmail(data: Record<string, unknown>) {
  const { render } = await import('@react-email/render')
  const { InvoiceEmail } = await import('@/emails/InvoiceEmail')

  const renderEmail = render(InvoiceEmail({
    organizationName: data.organizationName as string,
    invoiceNumber: data.invoiceNumber as string,
    amount: data.amount as number,
    invoiceDate: data.invoiceDate as string,
    invoiceUrl: data.invoiceUrl as string,
  }))

  return { renderEmail }
}

/**
 * Create and start the email worker
 */
export function startEmailWorker() {
  const worker = createWorker<EmailJobData>(
    QUEUE_NAMES.EMAIL,
    processEmail,
    {
      concurrency: 10, // Process up to 10 emails concurrently
    }
  )

  worker.on('completed', (job) => {
    console.log(`[EmailWorker] Job ${job.id} completed`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[EmailWorker] Job ${job?.id} failed:`, err)
  })

  worker.on('error', (err) => {
    console.error('[EmailWorker] Worker error:', err)
  })

  console.log('[EmailWorker] Worker started')

  return worker
}
