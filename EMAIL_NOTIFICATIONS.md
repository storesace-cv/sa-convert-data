# Email Notifications for Approval Workflow

## Overview
The StoresAce Dynamic Rules Engine includes automated email notifications for the approval workflow. Emails are sent via Supabase Edge Functions using SendGrid.

## Setup Instructions

### 1. Configure SendGrid API Key
1. Sign up for a SendGrid account at https://sendgrid.com
2. Generate an API key from SendGrid dashboard
3. In Supabase Dashboard:
   - Go to Project Settings → Edge Functions
   - Add environment variable: `SENDGRID_API_KEY`
   - Set value to your SendGrid API key
4. Verify sender email in SendGrid (noreply@storesace.com or your domain)

### 2. Email Notification Triggers

#### Approval Requested
- **Sent to:** Approvers with required roles
- **Triggered when:** User requests approval for rule promotion
- **Contains:** Rule details, requester info, direct link to approval interface

#### Approval Granted
- **Sent to:** Rule requester
- **Triggered when:** Approver approves the request
- **Contains:** Approval confirmation, approver comments, rule details

#### Approval Rejected
- **Sent to:** Rule requester
- **Triggered when:** Approver rejects the request
- **Contains:** Rejection reason, approver comments, rule details

#### Rule Promoted
- **Sent to:** Stakeholders (configurable)
- **Triggered when:** Rule is successfully promoted to new stage
- **Contains:** Promotion details, new stage, promoted by info

## Email Templates
All emails include:
- Professional HTML formatting
- Rule name and description
- Stage information
- Requester/approver details
- Direct action links
- Timestamp information

## Customization

### Change Sender Email
Edit `send-approval-notification` edge function:
```typescript
from: {
  email: 'your-email@yourdomain.com',
  name: 'Your App Name'
}
```

### Modify Approver Email Mapping
Edit `src/hooks/useApprovals.ts`:
```typescript
const roleEmailMap: Record<ApproverRole, string> = {
  'admin': 'admin@yourdomain.com',
  'manager': 'manager@yourdomain.com',
  // Add more roles...
};
```

### Customize Email Templates
Edit the HTML content in `send-approval-notification` edge function for each notification type.

## Testing
1. Create a draft rule
2. Request approval (check approver email)
3. Approve/reject request (check requester email)
4. Monitor Supabase Edge Function logs for any errors

## Troubleshooting
- **Emails not sending:** Check SENDGRID_API_KEY is set correctly
- **Emails in spam:** Verify sender domain in SendGrid
- **Wrong recipients:** Update roleEmailMap in useApprovals.ts
- **Template issues:** Check edge function logs in Supabase dashboard
