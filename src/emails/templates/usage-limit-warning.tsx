import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface UsageLimitWarningProps {
  userName: string;
  metricType: string;
  currentUsage: number;
  limit: number;
  percentage: number;
  upgradeUrl: string;
}

export const UsageLimitWarning = ({
  userName = 'there',
  metricType = 'API calls',
  currentUsage = 8500,
  limit = 10000,
  percentage = 85,
  upgradeUrl = 'https://tightshippms.com/billing',
}: UsageLimitWarningProps) => {
  const isCritical = percentage >= 95;
  const formatNumber = (num: number) => num.toLocaleString();
  
  return (
    <Html>
      <Head />
      <Preview>
        Usage limit warning - {percentage.toFixed(0)}% of {metricType} limit reached
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Heading style={logoText}>🚢 Tightship PMS</Heading>
          </Section>
          
          <Section style={isCritical ? criticalBanner : warningBanner}>
            <Text style={bannerText}>
              {isCritical ? '🚨 Critical Usage Alert' : '⚠️ Usage Warning'}
            </Text>
          </Section>

          <Heading style={h1}>
            {percentage.toFixed(1)}% of your {metricType} limit reached
          </Heading>
          
          <Text style={text}>
            Hi {userName},
          </Text>

          <Text style={text}>
            You've reached <strong>{percentage.toFixed(1)}%</strong> of your monthly {metricType} limit.
            {isCritical 
              ? ' This is a critical alert - you may experience service interruptions if you exceed your limit.'
              : ' We wanted to give you a heads up so you can plan accordingly.'
            }
          </Text>

          <Section style={usageDetails}>
            <Heading style={detailsHeading}>Current Usage</Heading>
            <div style={usageBar}>
              <div style={{...usageProgress, width: `${Math.min(percentage, 100)}%`}} />
            </div>
            <Text style={usageText}>
              <strong>{formatNumber(currentUsage)}</strong> / {formatNumber(limit)} {metricType}
            </Text>
            <Text style={percentageText}>
              {percentage.toFixed(1)}% used
            </Text>
          </Section>

          <Text style={text}>
            {isCritical ? (
              <>
                <strong>Immediate action recommended:</strong> To avoid service interruption, 
                please upgrade your plan or contact our support team to discuss your options.
              </>
            ) : (
              <>
                <strong>What happens next:</strong> If you reach 100% of your limit, 
                some features may be temporarily restricted until your next billing cycle 
                or until you upgrade your plan.
              </>
            )}
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={upgradeUrl}>
              Upgrade Your Plan
            </Button>
          </Section>

          <Text style={text}>
            <strong>Need help?</strong> Our support team is available to help you choose 
            the right plan for your needs or answer any questions about your usage.
          </Text>

          <Hr style={hr} />
          
          <Text style={footer}>
            Best regards,<br />
            The Tightship Team
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '580px',
};

const logoSection = {
  padding: '0 0 20px',
  textAlign: 'center' as const,
};

const logoText = {
  fontSize: '28px',
  fontWeight: 'bold',
  color: '#1f2937',
  margin: '0',
};

const warningBanner = {
  backgroundColor: '#f59e0b',
  borderRadius: '8px',
  padding: '16px',
  textAlign: 'center' as const,
  margin: '20px 0',
};

const criticalBanner = {
  backgroundColor: '#ef4444',
  borderRadius: '8px',
  padding: '16px',
  textAlign: 'center' as const,
  margin: '20px 0',
};

const bannerText = {
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0',
};

const h1 = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '30px 0',
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '26px',
};

const usageDetails = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
};

const detailsHeading = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
};

const usageBar = {
  backgroundColor: '#e5e7eb',
  borderRadius: '4px',
  height: '8px',
  margin: '12px 0',
  overflow: 'hidden',
};

const usageProgress = {
  backgroundColor: '#f59e0b',
  height: '100%',
  transition: 'width 0.3s ease',
};

const usageText = {
  color: '#374151',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '8px 0 4px 0',
};

const percentageText = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 24px',
  fontWeight: 'bold',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '42px 0',
};

const footer = {
  color: '#6b7280',
  fontSize: '14px',
  textAlign: 'center' as const,
};

export default UsageLimitWarning;