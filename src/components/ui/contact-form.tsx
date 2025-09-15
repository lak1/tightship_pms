'use client'

import { useState } from 'react'
import { toast } from 'sonner'

export default function ContactForm() {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    service: '',
    message: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const formPayload = new FormData()
      formPayload.append('access_key', process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY!)
      formPayload.append('name', formData.name)
      formPayload.append('email', formData.email)
      formPayload.append('phone', formData.phone)
      formPayload.append('service', formData.service)
      formPayload.append('message', formData.message)

      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: formPayload
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Message sent successfully! We\'ll get back to you soon.')
        
        // Reset form
        setFormData({
          name: '',
          email: '',
          phone: '',
          service: '',
          message: ''
        })
      } else {
        console.error('Web3Forms Error:', data)
        toast.error('Failed to send message. Please try again.')
      }
    } catch (error) {
      console.error('Form submission error:', error)
      toast.error('Failed to send message. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-semibold leading-6 text-gray-900">
          Name *
        </label>
        <input
          type="text"
          name="name"
          id="name"
          required
          value={formData.name}
          onChange={handleChange}
          className="mt-2 block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm sm:leading-6"
        />
      </div>
      
      <div>
        <label htmlFor="email" className="block text-sm font-semibold leading-6 text-gray-900">
          Email *
        </label>
        <input
          type="email"
          name="email"
          id="email"
          required
          value={formData.email}
          onChange={handleChange}
          className="mt-2 block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm sm:leading-6"
        />
      </div>
      
      <div>
        <label htmlFor="phone" className="block text-sm font-semibold leading-6 text-gray-900">
          Phone
        </label>
        <input
          type="tel"
          name="phone"
          id="phone"
          value={formData.phone}
          onChange={handleChange}
          className="mt-2 block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm sm:leading-6"
        />
      </div>
      
      <div>
        <label htmlFor="service" className="block text-sm font-semibold leading-6 text-gray-900">
          I'm interested in
        </label>
        <select
          id="service"
          name="service"
          value={formData.service}
          onChange={handleChange}
          className="mt-2 block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm sm:leading-6"
        >
          <option value="">-- Select One --</option>
          <option value="General Enquiry">General Enquiry</option>
          <option value="Free Trial">Free Trial</option>
          <option value="Product Demo">Product Demo</option>
          <option value="Enterprise Solution">Enterprise Solution</option>
        </select>
      </div>
      
      <div>
        <label htmlFor="message" className="block text-sm font-semibold leading-6 text-gray-900">
          Message
        </label>
        <textarea
          name="message"
          id="message"
          rows={4}
          value={formData.message}
          onChange={handleChange}
          className="mt-2 block w-full rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm sm:leading-6"
          placeholder="Tell us about your restaurant and what you need help with..."
        />
      </div>
      
      <div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-teal-600 px-3.5 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-teal-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Sending...' : 'Send Message'}
        </button>
      </div>
    </form>
  )
}