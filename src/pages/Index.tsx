
import Header from "../components/Header";
import Footer from "../components/Footer";
import Placeholder from "./placeholder.png";

import { motion } from "framer-motion";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      {/* Hero Section */}
      <main className="flex-grow">
        <section className="min-h-screen flex items-center pt-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Content */}
              <div className="space-y-6 animate-fade-in">
                <span className="inline-block px-4 py-2 bg-primary-light text-primary rounded-full text-sm font-medium">
                  Advanced Healthcare Technology
                </span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-text">
                  Advanced Heart Disease 
                  <span className="text-primary"> Prediction System</span>
                </h1>
                <p className="text-lg text-text-light">
                  Our cutting-edge AI-powered system helps predict and prevent heart disease 
                  through advanced analytics and personalized healthcare recommendations.
                </p>
                {/* <div className="flex flex-wrap gap-4">
                  <a
                    href="/get-started"
                    className="inline-flex items-center px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                  >
                    Get Started
                  </a>
                  <a
                    href="/learn-more"
                    className="inline-flex items-center px-6 py-3 border border-primary text-primary rounded-lg hover:bg-primary-light transition-colors"
                  >
                    Learn More
                  </a>
                </div> */}
              </div>

              {/* Image */}
              <div className="relative animate-slide-in">
                <img
                  src={Placeholder}
                  alt="Heart Analysis System"
                  className="w-full h-auto rounded-lg shadow-xl"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-primary-light/50 to-transparent rounded-lg" />
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
