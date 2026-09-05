import type { Metadata } from 'next';
import BookingExperience from './booking-experience';
import './booking.css';

export const metadata: Metadata = {
  title: 'Book your moment',
  description: 'Reserve a little time for yourself at SOLÉA.Co.',
};

export default function BookingPage() {
  return <BookingExperience />;
}
