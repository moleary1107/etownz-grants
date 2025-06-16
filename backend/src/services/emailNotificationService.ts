import nodemailer from 'nodemailer';
import { logger } from './logger';
import { CrawlAlert } from './crawlMonitoringService';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export interface AlertEmailData {
  alert: CrawlAlert;
  recipientEmail: string;
  recipientName?: string;
}

class EmailNotificationService {
  private transporter: nodemailer.Transporter;
  private config: EmailConfig;

  constructor() {
    this.config = {
      host: process.env.ELASTIC_EMAIL_SMTP_HOST || 'smtp.elasticemail.com',
      port: parseInt(process.env.ELASTIC_EMAIL_SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.ELASTIC_EMAIL_SMTP_USER || '',
        pass: process.env.ELASTIC_EMAIL_SMTP_PASS || '',
      },
      from: process.env.ELASTIC_EMAIL_FROM_EMAIL || 'alerts@etownz.com'
    };

    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth,
      tls: {
        rejectUnauthorized: false
      }
    });

    logger.info('Email notification service initialized', {
      host: this.config.host,
      port: this.config.port,
      from: this.config.from
    });
  }

  async sendCrawlAlert(alertData: AlertEmailData): Promise<boolean> {
    try {
      const { alert, recipientEmail, recipientName } = alertData;
      
      const subject = this.generateAlertSubject(alert);
      const htmlContent = this.generateAlertEmail(alert, recipientName);
      const textContent = this.generateAlertTextEmail(alert, recipientName);

      const mailOptions = {
        from: `"eTownz Grants Monitoring" <${this.config.from}>`,
        to: recipientEmail,
        subject,
        html: htmlContent,
        text: textContent,
        headers: {
          'X-Priority': alert.severity === 'critical' ? '1' : alert.severity === 'high' ? '2' : '3',
          'X-MSMail-Priority': alert.severity === 'critical' ? 'High' : 'Normal'
        }
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logger.info('Alert email sent successfully', {
        alertId: alert.id,
        alertType: alert.alertType,
        severity: alert.severity,
        recipient: recipientEmail,
        messageId: result.messageId
      });

      return true;
    } catch (error) {
      logger.error('Failed to send alert email', {
        alertId: alertData.alert.id,
        recipient: alertData.recipientEmail,
        error
      });
      return false;
    }
  }

  async sendBulkAlerts(alerts: CrawlAlert[], recipients: string[]): Promise<void> {
    try {
      const criticalAlerts = alerts.filter(alert => alert.severity === 'critical');
      const highAlerts = alerts.filter(alert => alert.severity === 'high');
      
      if (criticalAlerts.length === 0 && highAlerts.length === 0) {
        logger.info('No critical or high-severity alerts to send');
        return;
      }

      const subject = `🚨 eTownz Grants: ${criticalAlerts.length} Critical, ${highAlerts.length} High Alerts`;
      const htmlContent = this.generateBulkAlertEmail(alerts);
      const textContent = this.generateBulkAlertTextEmail(alerts);

      for (const recipient of recipients) {
        try {
          await this.transporter.sendMail({
            from: `"eTownz Grants Monitoring" <${this.config.from}>`,
            to: recipient,
            subject,
            html: htmlContent,
            text: textContent,
            headers: {
              'X-Priority': criticalAlerts.length > 0 ? '1' : '2',
              'X-MSMail-Priority': criticalAlerts.length > 0 ? 'High' : 'Normal'
            }
          });

          logger.info('Bulk alert email sent', { recipient, alertCount: alerts.length });
        } catch (error) {
          logger.error('Failed to send bulk alert email', { recipient, error });
        }
      }
    } catch (error) {
      logger.error('Failed to send bulk alert emails', { error });
    }
  }

  async sendTestEmail(recipient: string): Promise<boolean> {
    try {
      const testAlert: CrawlAlert = {
        id: 'test-alert',
        sourceId: 'test-source',
        sourceName: 'Test Grant Source',
        alertType: 'failure',
        severity: 'medium',
        message: 'This is a test alert to verify email notifications are working',
        details: { test: true },
        createdAt: new Date(),
        acknowledged: false
      };

      return await this.sendCrawlAlert({
        alert: testAlert,
        recipientEmail: recipient,
        recipientName: 'Test User'
      });
    } catch (error) {
      logger.error('Failed to send test email', { recipient, error });
      return false;
    }
  }

  private generateAlertSubject(alert: CrawlAlert): string {
    const severityEmoji = {
      critical: '🔴',
      high: '🟠', 
      medium: '🟡',
      low: '🟢'
    };

    const typeEmoji = {
      failure: '❌',
      timeout: '⏰',
      low_success_rate: '📉',
      no_recent_crawls: '🚫'
    };

    return `${severityEmoji[alert.severity]} ${typeEmoji[alert.alertType]} ${alert.sourceName}: ${alert.message}`;
  }

  private generateAlertEmail(alert: CrawlAlert, recipientName?: string): string {
    const severityColor = {
      critical: '#dc3545',
      high: '#fd7e14',
      medium: '#ffc107',
      low: '#28a745'
    };

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Grant Monitoring Alert</title>
    </head>
    <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f8f9fa;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="background-color: ${severityColor[alert.severity]}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">🚨 Grant Monitoring Alert</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">eTownz Grants Platform</p>
            </div>
            
            <div style="padding: 30px;">
                ${recipientName ? `<p>Hi ${recipientName},</p>` : ''}
                
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0;">
                    <h3 style="margin: 0 0 15px 0; color: #333;">Alert Details</h3>
                    
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #666; width: 150px;">Source:</td>
                            <td style="padding: 8px 0; color: #333;">${alert.sourceName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #666;">Type:</td>
                            <td style="padding: 8px 0; color: #333;">${alert.alertType.replace('_', ' ').toUpperCase()}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #666;">Severity:</td>
                            <td style="padding: 8px 0;">
                                <span style="background-color: ${severityColor[alert.severity]}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase;">
                                    ${alert.severity}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #666;">Time:</td>
                            <td style="padding: 8px 0; color: #333;">${alert.createdAt.toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; color: #666; vertical-align: top;">Message:</td>
                            <td style="padding: 8px 0; color: #333;">${alert.message}</td>
                        </tr>
                    </table>
                </div>

                ${Object.keys(alert.details).length > 0 ? `
                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <h4 style="margin: 0 0 10px 0; color: #856404;">Additional Details</h4>
                    <pre style="margin: 0; font-family: monospace; font-size: 12px; color: #856404; white-space: pre-wrap;">${JSON.stringify(alert.details, null, 2)}</pre>
                </div>
                ` : ''}

                <div style="margin: 30px 0 20px 0; padding-top: 20px; border-top: 1px solid #eee;">
                    <p style="margin: 0; color: #666; font-size: 14px;">
                        <strong>Next Steps:</strong><br>
                        ${this.getRecommendedActions(alert)}
                    </p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.FRONTEND_URL || 'https://grants.etownz.com'}/dashboard/automation/monitoring" 
                       style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                        View Monitoring Dashboard
                    </a>
                </div>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #eee;">
                <p style="margin: 0; color: #666; font-size: 12px;">
                    This alert was generated by the eTownz Grants monitoring system.<br>
                    Alert ID: ${alert.id}
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private generateAlertTextEmail(alert: CrawlAlert, recipientName?: string): string {
    return `
eTownz Grants - Monitoring Alert

${recipientName ? `Hi ${recipientName},\n\n` : ''}A ${alert.severity} alert has been triggered for grant source monitoring.

ALERT DETAILS:
Source: ${alert.sourceName}
Type: ${alert.alertType.replace('_', ' ').toUpperCase()}
Severity: ${alert.severity.toUpperCase()}
Time: ${alert.createdAt.toLocaleString()}
Message: ${alert.message}

${Object.keys(alert.details).length > 0 ? `
ADDITIONAL DETAILS:
${JSON.stringify(alert.details, null, 2)}
` : ''}

RECOMMENDED ACTIONS:
${this.getRecommendedActions(alert)}

View the monitoring dashboard: ${process.env.FRONTEND_URL || 'https://grants.etownz.com'}/dashboard/automation/monitoring

Alert ID: ${alert.id}
--
eTownz Grants Monitoring System
    `.trim();
  }

  private generateBulkAlertEmail(alerts: CrawlAlert[]): string {
    const criticalAlerts = alerts.filter(alert => alert.severity === 'critical');
    const highAlerts = alerts.filter(alert => alert.severity === 'high');
    const otherAlerts = alerts.filter(alert => !['critical', 'high'].includes(alert.severity));

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Grant Monitoring Summary</title>
    </head>
    <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f8f9fa;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="background-color: #dc3545; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">🚨 Grant Monitoring Summary</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">${alerts.length} alerts detected</p>
            </div>
            
            <div style="padding: 30px;">
                ${criticalAlerts.length > 0 ? `
                <div style="background-color: #f8d7da; border: 1px solid #dc3545; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <h3 style="margin: 0 0 15px 0; color: #721c24;">🔴 Critical Alerts (${criticalAlerts.length})</h3>
                    ${criticalAlerts.map(alert => `
                        <div style="margin: 10px 0; padding: 10px; background-color: white; border-radius: 4px;">
                            <strong>${alert.sourceName}</strong><br>
                            <span style="color: #666; font-size: 14px;">${alert.message}</span>
                        </div>
                    `).join('')}
                </div>
                ` : ''}

                ${highAlerts.length > 0 ? `
                <div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <h3 style="margin: 0 0 15px 0; color: #856404;">🟠 High Priority Alerts (${highAlerts.length})</h3>
                    ${highAlerts.map(alert => `
                        <div style="margin: 10px 0; padding: 10px; background-color: white; border-radius: 4px;">
                            <strong>${alert.sourceName}</strong><br>
                            <span style="color: #666; font-size: 14px;">${alert.message}</span>
                        </div>
                    `).join('')}
                </div>
                ` : ''}

                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.FRONTEND_URL || 'https://grants.etownz.com'}/dashboard/automation/monitoring" 
                       style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                        View All Alerts
                    </a>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private generateBulkAlertTextEmail(alerts: CrawlAlert[]): string {
    const criticalAlerts = alerts.filter(alert => alert.severity === 'critical');
    const highAlerts = alerts.filter(alert => alert.severity === 'high');

    return `
eTownz Grants - Monitoring Summary

${alerts.length} alerts have been detected across your grant sources.

${criticalAlerts.length > 0 ? `
CRITICAL ALERTS (${criticalAlerts.length}):
${criticalAlerts.map(alert => `- ${alert.sourceName}: ${alert.message}`).join('\n')}
` : ''}

${highAlerts.length > 0 ? `
HIGH PRIORITY ALERTS (${highAlerts.length}):
${highAlerts.map(alert => `- ${alert.sourceName}: ${alert.message}`).join('\n')}
` : ''}

View all alerts: ${process.env.FRONTEND_URL || 'https://grants.etownz.com'}/dashboard/automation/monitoring

--
eTownz Grants Monitoring System
    `.trim();
  }

  private getRecommendedActions(alert: CrawlAlert): string {
    switch (alert.alertType) {
      case 'failure':
        return '1. Check grant source website accessibility<br>2. Review crawl configuration<br>3. Verify network connectivity<br>4. Consider manual intervention if failures persist';
      case 'timeout':
        return '1. Check website performance<br>2. Review crawl timeout settings<br>3. Consider reducing crawl depth<br>4. Monitor network conditions';
      case 'low_success_rate':
        return '1. Review recent crawl failures<br>2. Check for website changes<br>3. Update crawl patterns if needed<br>4. Consider contacting website administrators';
      case 'no_recent_crawls':
        return '1. Verify automation service is running<br>2. Check job queue status<br>3. Review source scheduling configuration<br>4. Manually trigger a test crawl';
      default:
        return '1. Review the monitoring dashboard<br>2. Check system logs<br>3. Contact technical support if needed';
    }
  }

  async verifyEmailConfiguration(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info('Email configuration verified successfully');
      return true;
    } catch (error) {
      logger.error('Email configuration verification failed', { error });
      return false;
    }
  }
}

export const emailNotificationService = new EmailNotificationService();
export default EmailNotificationService;