# Simple Stripe Setup for eTownz Grants

Much simpler approach - just use Stripe's built-in features and dashboard for payment management.

## What We Use Stripe For

✅ **Payment Processing**: Cards, SEPA, Apple/Google Pay  
✅ **Subscription Management**: Recurring billing  
✅ **Customer Portal**: Self-service billing management  
✅ **Tax Handling**: Automatic VAT calculation  
✅ **Invoicing**: Automated invoice generation  
✅ **Analytics**: Built-in Stripe Dashboard  

## Setup Steps

### 1. Stripe Account Setup
```bash
# 1. Go to https://dashboard.stripe.com
# 2. Create account with Irish business address
# 3. Complete business verification
# 4. Enable tax collection for Ireland/EU
```

### 2. Create Products in Stripe Dashboard
```bash
# Go to Products → Add Product

Starter Plan:
- Name: "eTownz Grants Starter"
- Price: €99/month, €990/year
- Description: "10 applications, 3 users, 100 AI credits"

Professional Plan:
- Name: "eTownz Grants Professional" 
- Price: €299/month, €2,990/year
- Description: "50 applications, 10 users, 500 AI credits"

Enterprise Plan:
- Name: "eTownz Grants Enterprise"
- Price: €999/month, €9,990/year
- Description: "Unlimited everything"
```

### 3. Environment Variables
```bash
# Add to .env file
STRIPE_SECRET_KEY=sk_test_... # Get from Stripe Dashboard
STRIPE_PUBLISHABLE_KEY=pk_test_... # Get from Stripe Dashboard  
STRIPE_WEBHOOK_SECRET=whsec_... # Get from Stripe Webhooks

# Price IDs from your Stripe products
STRIPE_STARTER_MONTHLY_PRICE_ID=price_...
STRIPE_STARTER_YEARLY_PRICE_ID=price_...
STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID=price_...
STRIPE_PROFESSIONAL_YEARLY_PRICE_ID=price_...
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_...
STRIPE_ENTERPRISE_YEARLY_PRICE_ID=price_...
```

### 4. Webhook Setup
```bash
# In Stripe Dashboard → Webhooks → Add endpoint
Endpoint URL: https://grants.etownz.com/api/stripe/webhook

Events to listen for:
✅ customer.subscription.created
✅ customer.subscription.updated  
✅ customer.subscription.deleted
✅ invoice.payment_succeeded
✅ invoice.payment_failed
```

## API Endpoints

### Payment Flow
```typescript
// 1. Get pricing
GET /api/stripe/pricing

// 2. Create checkout (user selects plan)
POST /api/stripe/create-checkout
{
  "priceId": "price_starter_monthly"
}

// 3. Customer portal (manage subscription)
POST /api/stripe/create-portal

// 4. Get customer info
GET /api/stripe/customer
```

## Frontend Integration

### Pricing Page
```typescript
// Fetch pricing from your API
const pricing = await fetch('/api/stripe/pricing')

// Show plans, user clicks "Subscribe"
// Redirect to Stripe Checkout
const checkout = await fetch('/api/stripe/create-checkout', {
  method: 'POST',
  body: JSON.stringify({ priceId: 'price_starter_monthly' })
})

window.location.href = checkout.data.url
```

### Customer Portal
```typescript
// User clicks "Manage Billing" in dashboard
const portal = await fetch('/api/stripe/create-portal', {
  method: 'POST'
})

window.location.href = portal.data.url
```

## What Stripe Dashboard Manages

✅ **Customers**: View all customers and their details  
✅ **Subscriptions**: See active/cancelled subscriptions  
✅ **Invoices**: All billing history and invoice status  
✅ **Payments**: Payment history, failed payments, refunds  
✅ **Analytics**: Revenue, churn, growth metrics  
✅ **Tax Reports**: VAT/tax reporting for compliance  
✅ **Disputes**: Handle chargebacks and disputes  

## Irish/EU Compliance

### Automatic VAT
- Stripe automatically calculates Irish VAT (23%)
- EU VAT for other countries
- Handles B2B reverse charge
- VAT-compliant invoices

### Payment Methods
- Irish/EU credit/debit cards
- SEPA Direct Debit
- Apple Pay / Google Pay
- Bank transfers

### Regulatory
- PCI DSS compliant (Stripe handles this)
- Strong Customer Authentication (SCA)
- GDPR compliant data handling

## Benefits of This Approach

✅ **Simple**: No complex financial service code  
✅ **Reliable**: Stripe handles all payment complexity  
✅ **Compliant**: Automatic tax and regulatory compliance  
✅ **Scalable**: Stripe scales with your business  
✅ **Dashboard**: Rich analytics and management UI  
✅ **Support**: Stripe customer support for payment issues  

## Next Steps

1. **Setup Stripe Account**: Business verification with Irish address
2. **Create Products**: Set up your subscription plans  
3. **Test Integration**: Use test mode for development
4. **Go Live**: Switch to live keys when ready

## Total Implementation

- **Backend**: ~200 lines of code (simple Stripe wrapper)
- **Frontend**: Use Stripe Checkout (hosted by Stripe)  
- **Management**: Use Stripe Dashboard (no custom admin needed)
- **Compliance**: Handled automatically by Stripe

Much simpler than building a custom financial system! 🎉