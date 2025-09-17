'use client'

import Link from 'next/link'
import { CheckCircle, Menu, X, ArrowRight, Star, Users, Zap, Shield } from 'lucide-react'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import ContactForm from '@/components/ui/contact-form'

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { data: session } = useSession()

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="relative bg-transparent z-50">
        <nav className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8 relative z-50">
          <div className="flex lg:flex-1 relative z-50">
            <Link href="/" className="-m-1.5 p-1.5 relative z-50">
              <span className="text-2xl font-bold text-gray-900">Tightship</span>
            </Link>
          </div>
          
          <div className="flex lg:hidden relative z-50">
            <button
              type="button"
              className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700 relative z-50"
              onClick={() => setIsMenuOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
          
          <div className="hidden lg:flex lg:gap-x-12 relative z-50">
            <a href="#benefits" className="text-sm font-semibold leading-6 text-gray-900 hover:text-teal-600 transition-colors cursor-pointer relative z-50">
              Benefits
            </a>
            <a href="#pricing" className="text-sm font-semibold leading-6 text-gray-900 hover:text-teal-600 transition-colors cursor-pointer relative z-50">
              Pricing
            </a>
            <a href="#contact" className="text-sm font-semibold leading-6 text-gray-900 hover:text-teal-600 transition-colors cursor-pointer relative z-50">
              Contact
            </a>
          </div>
          
          <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-4 lg:items-center relative z-50">
            {session ? (
              <>
                <span className="text-sm text-gray-600">Welcome back, {session.user?.name || session.user?.email?.split('@')[0]}</span>
                <Link
                  href="/dashboard"
                  className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 transition-colors cursor-pointer relative z-50"
                >
                  Go to Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link href="/auth/signin" className="text-sm font-semibold leading-6 text-gray-900 hover:text-teal-600 transition-colors cursor-pointer relative z-50">
                  Sign in
                </Link>
                  <Link
                    href="#pricing"
                    className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 transition-colors cursor-pointer relative z-50"
                  >
                    Get started
                  </Link>
                </>
              )}
            </div>
        </nav>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="lg:hidden">
            <div className="fixed inset-0 z-50" onClick={() => setIsMenuOpen(false)} />
            <div className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
              <div className="flex items-center justify-between">
                <Link href="/" className="-m-1.5 p-1.5">
                  <span className="text-2xl font-bold text-gray-900">Tightship</span>
                </Link>
                <button
                  type="button"
                  className="-m-2.5 rounded-md p-2.5 text-gray-700"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="mt-6 flow-root">
                <div className="-my-6 divide-y divide-gray-500/10">
                  <div className="space-y-2 py-6">
                    <a href="#benefits" className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50" onClick={() => setIsMenuOpen(false)}>
                      Benefits
                    </a>
                    <a href="#pricing" className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50" onClick={() => setIsMenuOpen(false)}>
                      Pricing
                    </a>
                    <a href="#contact" className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50" onClick={() => setIsMenuOpen(false)}>
                      Contact
                    </a>
                  </div>
                  <div className="py-6">
                    <Link
                      href="/auth/signin"
                      className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                    >
                      Sign in
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative isolate px-6 pt-14 lg:px-8 bg-gradient-to-br from-teal-50 via-teal-100 to-cyan-100 min-h-screen">
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-teal-400 to-cyan-600 opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
        </div>
        
        <div className="mx-auto max-w-4xl pt-16 pb-32 sm:pt-20 sm:pb-40 lg:pt-24 lg:pb-48">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
              Complete Menu Management.
              <span className="block text-teal-600 mt-2">One Platform.</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
              Manage menus, track ingredients & allergens, sync prices across platforms, and gain valuable insights into your restaurant operations. 
              Everything you need for comprehensive menu management.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:border-transparent"
              />
              <Link href="/auth/signup" className="w-full sm:w-auto px-6 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap inline-block text-center">
                Get Started
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">Start your free trial today. No credit card required.</p>
          </div>
        </div>
        
        <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]">
          <div className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-teal-400 to-cyan-600 opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]" />
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-24 sm:py-32 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Why Choose Tightship Menu Manager?
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Transform your restaurant operations with our comprehensive menu management platform.
            </p>
          </div>
          
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <Zap className="h-5 w-5 flex-none text-teal-600" />
                  Complete Menu Management
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">Create, organize and manage your complete menu with ingredients, allergens, nutritional info, and pricing all in one place.</p>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <Users className="h-5 w-5 flex-none text-teal-600" />
                  Allergen & Ingredient Tracking
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">Track ingredients and allergens across all menu items. Automatically generate allergen information and ensure compliance.</p>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <Shield className="h-5 w-5 flex-none text-teal-600" />
                  Multi-Platform Sync
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">Sync your complete menu data across all delivery platforms and POS systems with real-time updates.</p>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 sm:py-32 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2 lg:items-start">
            <div className="lg:pr-4 lg:pt-4">
              <div className="lg:max-w-lg">
                <h2 className="text-base font-semibold leading-7 text-teal-600">Everything you need</h2>
                <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Universal Platform Compatibility</p>
                <p className="mt-6 text-lg leading-8 text-gray-600">
                  Works with major delivery apps, Loyverse ePOS, ePOS Now, and more. Plus an open API for broad integration.
                </p>
                <dl className="mt-10 max-w-xl space-y-8 text-base leading-7 text-gray-600 lg:max-w-none">
                  <div className="relative pl-9">
                    <dt className="inline font-semibold text-gray-900">
                      <CheckCircle className="absolute left-1 top-1 h-5 w-5 text-teal-600" />
                      Complete Menu Data
                    </dt>
                    <dd className="inline"> — Sync full menu details including prices, descriptions, allergens, and ingredients.</dd>
                  </div>
                  <div className="relative pl-9">
                    <dt className="inline font-semibold text-gray-900">
                      <CheckCircle className="absolute left-1 top-1 h-5 w-5 text-teal-600" />
                      Delivery Platform Integration
                    </dt>
                    <dd className="inline"> — Seamless integration with Deliveroo, Uber Eats, Just Eat, and more.</dd>
                  </div>
                  <div className="relative pl-9">
                    <dt className="inline font-semibold text-gray-900">
                      <CheckCircle className="absolute left-1 top-1 h-5 w-5 text-teal-600" />
                      POS System Compatibility
                    </dt>
                    <dd className="inline"> — Connect with Loyverse, ePOS Now, Square, Toast, and other major POS systems.</dd>
                  </div>
                </dl>
              </div>
            </div>
            <img
              src="/images/section/2.jpg"
              alt="Platform integrations"
              className="w-[48rem] max-w-none rounded-xl shadow-xl ring-1 ring-gray-400/10 sm:w-[57rem] md:-ml-4 lg:ml-0"
              width={2432}
              height={1442}
            />
          </div>
          
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2 lg:items-center">
            <div className="relative lg:order-first">
              <img
                src="/images/section/3.jpg"
                alt="Menu syncing dashboard"
                className="w-full rounded-xl shadow-xl ring-1 ring-gray-400/10"
                width={2432}
                height={1442}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent rounded-xl"></div>
            </div>
            <div className="lg:pl-8">
              <div className="lg:max-w-lg">
                <h2 className="text-base font-semibold leading-7 text-teal-600">Smart menu management</h2>
                <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Advanced Menu Features</p>
                <p className="mt-6 text-lg leading-8 text-gray-600">
                  Beyond basic menu management - track ingredients, manage allergens, organize categories, and maintain comprehensive menu data.
                </p>
                <dl className="mt-10 max-w-xl space-y-8 text-base leading-7 text-gray-600 lg:max-w-none">
                  <div className="relative pl-9">
                    <dt className="inline font-semibold text-gray-900">
                      <CheckCircle className="absolute left-1 top-1 h-5 w-5 text-teal-600" />
                      Ingredient Management
                    </dt>
                    <dd className="inline"> — Track ingredients across all menu items with automatic allergen detection.</dd>
                  </div>
                  <div className="relative pl-9">
                    <dt className="inline font-semibold text-gray-900">
                      <CheckCircle className="absolute left-1 top-1 h-5 w-5 text-teal-600" />
                      Menu Organization
                    </dt>
                    <dd className="inline"> — Organize items into categories and manage multiple menus per location.</dd>
                  </div>
                  <div className="relative pl-9">
                    <dt className="inline font-semibold text-gray-900">
                      <CheckCircle className="absolute left-1 top-1 h-5 w-5 text-teal-600" />
                      Compliance Tracking
                    </dt>
                    <dd className="inline"> — Ensure allergen compliance and generate required documentation automatically.</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 sm:py-32 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-base font-semibold leading-7 text-teal-600">Pricing</h2>
            <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Choose the right plan for your business
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Start with a free trial, then upgrade as you grow. All plans include our core features.
            </p>
          </div>
          
          <div className="isolate mx-auto mt-10 space-y-8">
            <div className="grid max-w-md mx-auto grid-cols-1 gap-6 lg:mx-0 lg:max-w-none lg:grid-cols-4">
            {/* Free Plan */}
            <div className="rounded-3xl p-6 ring-1 ring-gray-200 xl:p-8">
              <div className="flex items-center justify-between gap-x-4">
                <h3 className="text-lg font-semibold leading-8 text-gray-900">Free</h3>
              </div>
              <p className="mt-4 text-sm leading-6 text-gray-600">Try before you commit</p>
              <p className="mt-6 flex items-baseline gap-x-1">
                <span className="text-4xl font-bold tracking-tight text-gray-900">£0</span>
                <span className="text-sm font-semibold leading-6 text-gray-600">/month</span>
              </p>
              <Link
                href="/auth/signup"
                className="mt-6 block rounded-md bg-gray-600 px-3 py-2 text-center text-sm font-semibold leading-6 text-white shadow-sm hover:bg-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600"
              >
                Get started
              </Link>
              <ul className="mt-6 space-y-2 text-sm leading-6 text-gray-600 xl:mt-8">
                <li className="flex gap-x-3">
                  <CheckCircle className="h-5 w-4 flex-none text-green-500" />
                  1 Restaurant Location
                </li>
                <li className="flex gap-x-3">
                  <CheckCircle className="h-5 w-4 flex-none text-green-500" />
                  1 Menu
                </li>
                <li className="flex gap-x-3">
                  <CheckCircle className="h-5 w-4 flex-none text-green-500" />
                  50 Menu Items
                </li>
                <li className="flex gap-x-3">
                  <CheckCircle className="h-5 w-4 flex-none text-green-500" />
                  Website API Only
                </li>
              </ul>
            </div>
            {/* Single Location Plan */}
            <div className="rounded-3xl p-6 ring-1 ring-gray-200 xl:p-8">
              <div className="flex items-center justify-between gap-x-4">
                <h3 className="text-lg font-semibold leading-8 text-gray-900">Single</h3>
              </div>
              <p className="mt-4 text-sm leading-6 text-gray-600">Perfect for single operations</p>
              <p className="mt-6 flex items-baseline gap-x-1">
                <span className="text-4xl font-bold tracking-tight text-gray-900">£10</span>
                <span className="text-sm font-semibold leading-6 text-gray-600">/month</span>
              </p>
              <Link
                href="/auth/signup"
                className="mt-6 block rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold leading-6 text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Get started
              </Link>
              <ul className="mt-6 space-y-2 text-sm leading-6 text-gray-600 xl:mt-8">
                <li className="flex gap-x-3">
                  <CheckCircle className="h-5 w-4 flex-none text-green-500" />
                  1 Restaurant Location
                </li>
                <li className="flex gap-x-3">
                  <CheckCircle className="h-5 w-4 flex-none text-green-500" />
                  5 Menus
                </li>
                <li className="flex gap-x-3">
                  <CheckCircle className="h-5 w-4 flex-none text-green-500" />
                  200 Menu Items
                </li>
                <li className="flex gap-x-3">
                  <CheckCircle className="h-5 w-4 flex-none text-green-500" />
                  All Integrations
                </li>
              </ul>
            </div>

            {/* Multi-Location Plan */}
            <div className="rounded-3xl p-6 ring-2 ring-teal-600 xl:p-8">
              <div className="flex items-center justify-between gap-x-4">
                <h3 className="text-lg font-semibold leading-8 text-teal-600">Multi</h3>
                <p className="rounded-full bg-teal-600/10 px-2.5 py-1 text-xs font-semibold leading-5 text-teal-600">
                  Most popular
                </p>
              </div>
              <p className="mt-4 text-sm leading-6 text-gray-600">Growing restaurant chains</p>
              <p className="mt-6 flex items-baseline gap-x-1">
                <span className="text-4xl font-bold tracking-tight text-gray-900">£27</span>
                <span className="text-sm font-semibold leading-6 text-gray-600">/month</span>
              </p>
              <Link
                href="/auth/signup"
                className="mt-6 block rounded-md bg-teal-600 px-3 py-2 text-center text-sm font-semibold leading-6 text-white shadow-sm hover:bg-teal-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
              >
                Get started
              </Link>
              <ul className="mt-6 space-y-2 text-sm leading-6 text-gray-600 xl:mt-8">
                <li className="flex gap-x-3">
                  <CheckCircle className="h-5 w-4 flex-none text-green-500" />
                  3 Restaurant Locations
                </li>
                <li className="flex gap-x-3">
                  <CheckCircle className="h-5 w-4 flex-none text-green-500" />
                  Unlimited Menus
                </li>
                <li className="flex gap-x-3">
                  <CheckCircle className="h-5 w-4 flex-none text-green-500" />
                  Unlimited Menu Items
                </li>
                <li className="flex gap-x-3">
                  <CheckCircle className="h-5 w-4 flex-none text-green-500" />
                  All Integrations
                </li>
              </ul>
            </div>

            {/* Growing Chain Plan */}
            <div className="rounded-3xl p-6 ring-1 ring-gray-200 xl:p-8">
              <div className="flex items-center justify-between gap-x-4">
                <h3 className="text-lg font-semibold leading-8 text-gray-900">Growing</h3>
              </div>
              <p className="mt-4 text-sm leading-6 text-gray-600">Established restaurant groups</p>
              <p className="mt-6 flex items-baseline gap-x-1">
                <span className="text-4xl font-bold tracking-tight text-gray-900">£59</span>
                <span className="text-sm font-semibold leading-6 text-gray-600">/month</span>
              </p>
              <Link
                href="/auth/signup"
                className="mt-6 block rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold leading-6 text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Get started
              </Link>
              <ul className="mt-6 space-y-2 text-sm leading-6 text-gray-600 xl:mt-8">
                <li className="flex gap-x-3">
                  <CheckCircle className="h-5 w-4 flex-none text-green-500" />
                  9 Restaurant Locations
                </li>
                <li className="flex gap-x-3">
                  <CheckCircle className="h-5 w-4 flex-none text-green-500" />
                  Unlimited Menus
                </li>
                <li className="flex gap-x-3">
                  <CheckCircle className="h-5 w-4 flex-none text-green-500" />
                  Unlimited Menu Items
                </li>
                <li className="flex gap-x-3">
                  <CheckCircle className="h-5 w-4 flex-none text-green-500" />
                  Priority Support
                </li>
              </ul>
            </div>
            </div>

            {/* Enterprise Plan - Full Width with Better Layout */}
            <div className="rounded-3xl p-8 ring-1 ring-gray-200 xl:p-10 bg-gray-50">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-semibold leading-8 text-gray-900">Enterprise</h3>
                  <p className="mt-4 text-lg leading-6 text-gray-600">For large restaurant chains (10+ locations)</p>
                  <p className="mt-6 flex items-baseline justify-center gap-x-1">
                    <span className="text-4xl font-bold tracking-tight text-gray-900">Custom Pricing</span>
                  </p>
                  <div className="mt-6 flex justify-center">
                    <Link
                      href="#contact"
                      className="rounded-md bg-gray-600 px-6 py-3 text-center text-sm font-semibold leading-6 text-white shadow-sm hover:bg-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600 max-w-xs"
                    >
                      Contact us for pricing
                    </Link>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                  <div className="flex gap-x-3">
                    <CheckCircle className="h-6 w-5 flex-none text-teal-600 mt-1" />
                    <span className="text-sm leading-6 text-gray-600">Full access to all platform integrations</span>
                  </div>
                  <div className="flex gap-x-3">
                    <CheckCircle className="h-6 w-5 flex-none text-teal-600 mt-1" />
                    <span className="text-sm leading-6 text-gray-600">Menu, cost, and profit analytics</span>
                  </div>
                  <div className="flex gap-x-3">
                    <CheckCircle className="h-6 w-5 flex-none text-teal-600 mt-1" />
                    <span className="text-sm leading-6 text-gray-600">Menu management for unlimited locations</span>
                  </div>
                  <div className="flex gap-x-3">
                    <CheckCircle className="h-6 w-5 flex-none text-teal-600 mt-1" />
                    <span className="text-sm leading-6 text-gray-600">Dedicated account manager</span>
                  </div>
                  <div className="flex gap-x-3">
                    <CheckCircle className="h-6 w-5 flex-none text-teal-600 mt-1" />
                    <span className="text-sm leading-6 text-gray-600">Custom integrations</span>
                  </div>
                  <div className="flex gap-x-3">
                    <CheckCircle className="h-6 w-5 flex-none text-teal-600 mt-1" />
                    <span className="text-sm leading-6 text-gray-600">Priority technical support</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 sm:py-32 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Get in Touch</h2>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Ready to streamline your menu management? Contact us today to get started.
            </p>
          </div>
          
          <div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-16 sm:grid-cols-2">
            {/* Contact Form */}
            <div>
              <ContactForm />
            </div>

            {/* Contact Information */}
            <div className="lg:mt-6">
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-semibold leading-6 text-gray-900">Our Office</h3>
                  <address className="mt-3 space-y-1 text-sm not-italic leading-6 text-gray-600">
                    <div>Tightship</div>
                    <div>23-25 The Broadway</div>
                    <div>Wickford</div>
                    <div>Essex SS11 7AD</div>
                    <div>United Kingdom</div>
                  </address>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold leading-6 text-gray-900">Contact Details</h3>
                  <dl className="mt-3 space-y-1 text-sm leading-6 text-gray-600">
                    <div>
                      <dt className="sr-only">Phone</dt>
                      <dd>
                        <a href="tel:+447976605365" className="hover:text-teal-600">
                          +44 7976 605365
                        </a>
                      </dd>
                    </div>
                    <div>
                      <dt className="sr-only">Email</dt>
                      <dd>
                        <a href="mailto:info@tightship.co.uk" className="hover:text-teal-600">
                          info@tightship.co.uk
                        </a>
                      </dd>
                    </div>
                  </dl>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold leading-6 text-gray-900">Follow Us</h3>
                  <div className="mt-3 flex space-x-4">
                    <a href="https://facebook.com/tightshipapp" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-500">
                      <span className="sr-only">Facebook</span>
                      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                      </svg>
                    </a>
                    <a href="https://linkedin.com/company/tightship" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-500">
                      <span className="sr-only">LinkedIn</span>
                      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                    </a>
                    <a href="https://www.instagram.com/tightship.app" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-500">
                      <span className="sr-only">Instagram</span>
                      <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.618 5.367 11.986 11.988 11.986s11.987-5.368 11.987-11.986C24.004 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.317C4.25 14.81 3.76 13.659 3.76 12.362s.49-2.448 1.366-3.323c.875-.827 2.026-1.317 3.323-1.317s2.448.49 3.323 1.317c.827.875 1.317 2.026 1.317 3.323s-.49 2.448-1.317 3.323c-.875.827-2.026 1.317-3.323 1.317zm0-7.705c-.827 0-1.588.316-2.159.886-.57.57-.886 1.332-.886 2.159s.316 1.588.886 2.159c.57.57 1.332.886 2.159.886s1.588-.316 2.159-.886c.57-.57.886-1.332.886-2.159s-.316-1.588-.886-2.159c-.57-.57-1.332-.886-2.159-.886zm4.52-1.414c-.316 0-.57-.255-.57-.57s.255-.57.57-.57.57.255.57.57-.255.57-.57.57z" clipRule="evenodd" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:flex md:items-center md:justify-between lg:px-8">
          <div className="flex justify-center space-x-6 md:order-2">
            <Link href="#" className="text-gray-400 hover:text-gray-500">
              Terms of Use
            </Link>
            <Link href="#" className="text-gray-400 hover:text-gray-500">
              Privacy Policy
            </Link>
          </div>
          <div className="mt-8 md:order-1 md:mt-0">
            <p className="text-center text-xs leading-5 text-gray-500">
              &copy; 2024 Tightship. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}