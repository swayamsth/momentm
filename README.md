# Momentm — AI Fitness App

## Structure

```
momentm/
├── frontend/          # Next.js 16 App Router app
│   ├── app/           # Pages (App Router)
│   │   ├── page.tsx              # Auth/Login page
│   │   ├── dashboard/page.tsx    # Dashboard
│   │   ├── ai/page.tsx           # Momentm AI insights
│   │   ├── loops/page.tsx        # Social feed & communities
│   │   ├── leaderboard/page.tsx  # Leaderboard & badges
│   │   ├── coaching/page.tsx     # Pricing & coaches
│   │   ├── settings/page.tsx     # Account settings + 2FA
│   │   ├── forgot-password/      # Password reset flow
│   │   ├── reset-password/       # Password reset confirm
│   │   ├── verify-otp/           # Email OTP verification
│   │   └── verify-2fa/           # 2FA verification
│   ├── components/
│   │   ├── AppShell.tsx          # Sidebar layout (ported from Lovable)
│   │   └── ui/                   # Full shadcn/ui component library
│   ├── lib/utils.ts              # cn() utility
│   └── hooks/use-mobile.tsx      # Mobile detection hook
└── backend/           # Django REST API (unchanged)
    ├── accounts/      # Auth, users, posts, comments
    └── core/          # Settings, URLs
```

## Setup

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

The frontend runs on http://localhost:3000
The Django API runs on http://127.0.0.1:8000
