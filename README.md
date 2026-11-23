# Glide Vendor Operations Command Center

A high-performance, real-time fleet operations and booking management portal for transport vendors, built with React 18, Vite, TypeScript, and Tailwind CSS.

---

## 🚀 Key Features

- **Operations Command Center**: Real-time fleet status, active drivers, vehicle allocation, and daily schedule tracking.
- **Rent A Cab Workflows**:
  - **Airport Transfer**:
    - **BLR Airport Pickup**: Fixed static pickup at Kempegowda International Airport (Terminal 1 & Terminal 2) with dynamic destination entry and interactive map selection.
    - **BLR Airport Drop**: Dynamic pickup location with fixed drop at Kempegowda International Airport (Terminal 1 & Terminal 2).
  - **Outstation & Package Rentals**: Multi-city and hourly package booking with route and map support.
- **Interactive Map Picker**: Leaflet / OpenStreetMap integration with live location search and quick Bengaluru tech hub shortcuts.
- **Prepaid Wallet & Automated Escrow**:
  - Live wallet balance tracking with low-balance alerts.
  - Seamless instant wallet top-up via **Razorpay** payment gateway (UPI, Cards, NetBanking).
  - Automated escrow settlement for driver shares and platform fees upon trip completion.
- **Driver & Fleet Management**: Driver onboarding, vehicle assignment, license verification, and duty status toggling.
- **Enterprise Security**: JWT-based authentication, role-based access control (`VENDOR_ADMIN`), and strict credential validation.

---

## 🛠️ Tech Stack

- **Framework**: React 18 with Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS & Lucide Icons
- **State & Data Fetching**: TanStack React Query & Axios
- **Maps**: Leaflet & OpenStreetMap
- **Payments**: Razorpay Checkout SDK
- **Notifications**: React Hot Toast

---

## 🏁 Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/amruthagowdar/glide-vendor.git
   cd glide-vendor
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Copy `.env.example` to `.env` and fill in your API URL and Razorpay Key ID:
   ```env
   VITE_API_URL=http://localhost:3001/api
   VITE_APP_NAME=Glide Vendor
   VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

---

## 📄 License

Proprietary - Glide Technologies. All rights reserved.
