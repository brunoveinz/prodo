<div align="center">
  <br />
  <h1>Prodo</h1>
  <p><strong>A premium, distraction-free productivity and deep work tracking application.</strong></p>
</div>

<br />

## 🚀 Overview

Prodo is a meticulously crafted Pomodoro and task-tracking application designed for deep work. Built with modern web technologies, it features an immersive, distraction-free interface that scales elegantly across devices, letting you track your cycles, log distractions, and view comprehensive daily insights.

## ✨ Features

- **Immersive Deep Work Mode**: A distraction-free timer loop with visual cues, micro-animations, and full-screen compatibility.
- **Smart Cycle Management**: Automatically transitions between focus sessions (25m), short breaks (5m), and long breaks (15m).
- **Distraction Logging**: Keep track of internal and external interruptions with a quick press of the spacebar.
- **Guest & Authenticated Flows**: Jump right into a session without an account, or log in to persist your data, objectives, and analytics.
- **Beautiful & Fully Responsive**: State-of-the-art UI utilizing Tailwind CSS, sleek glassmorphism, and responsive SVG elements.

## 🛠 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router & Turbopack)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Database**: [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication**: [Auth.js (NextAuth v5)](https://authjs.dev/)

## 💻 Getting Started

### Prerequisites

Make sure you have Node.js and npm (or pnpm/yarn) installed on your system.

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/prodo.git
   cd prodo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Environment Variables**
   Create a `.env.local` file in the root directory and configure your authentication and database credentials (refer to `.env.example` if available).

4. **Initialize the Database**
   ```bash
   npm run db:push
   ```

5. **Start the Development Server**
   ```bash
   npm run dev
   ```

6. **Open the app**
   Visit `http://localhost:3000` to see your application in action.

## 🚀 Deployment

Prodo is fully optimized to be deployed on [Vercel](https://vercel.com/):

```bash
npx vercel
```

## 📝 License

This project is licensed under the MIT License. Feel free to use, modify, and distribute it as you see fit.
