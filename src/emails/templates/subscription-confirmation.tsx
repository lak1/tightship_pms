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

interface SubscriptionConfirmationProps {
  userName: string;
  planName: string;
  amount: number;
  nextBillingDate: string;
  dashboardUrl: string;
}

export const SubscriptionConfirmation = ({
  userName = 'there',
  planName = 'Starter',
  amount = 29,
  nextBillingDate = 'January 1, 2024',
  dashboardUrl = 'https://tightshippms.com/dashboard',
}: SubscriptionConfirmationProps) => (
  <Html>
    <Head />
    <Preview>Subscription confirmed - {planName} Plan</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Heading style={logoText}>🚢 Tightship PMS</Heading>
        </Section>
        
        <Section style={successBanner}>
          <Text style={successText}>✅ Subscription Confirmed!</Text>
        </Section>

        <Heading style={h1}>
          Welcome to the {planName} Plan!
        </Heading>
        
        <Text style={text}>
          Hi {userName},
        </Text>

        <Text style={text}>
          Your subscription to the <strong>{planName} plan</strong> has been confirmed! 
          Thank you for choosing Tightship PMS to power your restaurant operations.
        </Text>

        <Section style={subscriptionDetails}>
          <Heading style={detailsHeading}>Subscription Details</Heading>
          <Text style={detailItem}>
            <strong>Plan:</strong> {planName}
          </Text>
          <Text style={detailItem}>
            <strong>Amount:</strong> ${amount}/month
          </Text>
          <Text style={detailItem}>
            <strong>Next billing date:</strong> {nextBillingDate}
          </Text>
        </Section>

        <Text style={text}>
          You now have access to all {planName} features including:
        </Text>

        <ul style={list}>
          {planName === 'Starter' && (
            <>
              <li>Up to 3 restaurants</li>
              <li>500 products</li>
              <li>10,000 API calls/month</li>
              <li>All platform integrations</li>
              <li>Email support</li>
            </>
          )}
          {planName === 'Professional' && (
            <>
              <li>Up to 10 restaurants</li>
              <li>Unlimited products</li>
              <li>100,000 API calls/month</li>
              <li>Advanced analytics</li>
              <li>Bulk operations</li>
              <li>Priority support</li>
            </>
          )}
          {planName === 'Enterprise' && (
            <>
              <li>Unlimited restaurants</li>
              <li>Unlimited products</li>
              <li>Unlimited API calls</li>
              <li>Custom integrations</li>
              <li>Dedicated support</li>
              <li>SLA guarantee</li>
            </>
          )}
        </ul>

        <Section style={buttonContainer}>
          <Button style={button} href={dashboardUrl}>
            Access Your Dashboard
          </Button>
        </Section>

        <Text style={text}>
          If you have any questions about your subscription or need help getting started, 
          our support team is here to help.
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

const successBanner = {
  backgroundColor: '#10b981',
  borderRadius: '8px',
  padding: '16px',
  textAlign: 'center' as const,
  margin: '20px 0',
};

const successText = {
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

const subscriptionDetails = {
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

const detailItem = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '8px 0',
};

const list = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '26px',
  paddingLeft: '20px',
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

export default SubscriptionConfirmation;