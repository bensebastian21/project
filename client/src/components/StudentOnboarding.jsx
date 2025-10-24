import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import config from "../config";

const StudentOnboarding = ({ onComplete, user }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Career preferences
    preferredCareerSectors: [],
    preferredJobRoles: [],
    futurePlan: "",
    careerGoals: "",
    skillsToDevelop: [],
    preferredWorkMode: "Remote",
    preferredCompanyType: [],
    
    // Personal interests and preferences
    hobbies: [],
    eventTypesInterested: [],
    availabilityPreferences: [],
    willingnessToTravel: "",
    
    // Advanced preferences
    preferredLearningStyle: "",
    peerGroups: []
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [rawHobbiesText, setRawHobbiesText] = useState("");
  useEffect(() => {
    setRawHobbiesText((formData.hobbies || []).join(', '));
  }, [formData.hobbies]);

  const validateField = (field, value, all) => {
    const isEmpty = (v) => !v || (Array.isArray(v) && v.length === 0) || (typeof v === 'string' && v.trim() === '');
    switch (field) {
      case 'preferredCareerSectors':
      case 'preferredJobRoles':
      case 'preferredCompanyType':
      case 'eventTypesInterested':
      case 'availabilityPreferences':
        return isEmpty(value) ? 'Please select at least one option' : '';
      case 'futurePlan':
      case 'willingnessToTravel':
      case 'preferredLearningStyle':
        return isEmpty(value) ? 'Please choose an option' : '';
      case 'careerGoals':
        return isEmpty(value) ? 'This field is required' : '';
      default:
        return '';
    }
  };

  const handleFieldFocus = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    setErrors(prev => ({ ...prev, [field]: validateField(field, formData[field], formData) }));
  };

  const careerSectors = [
    "IT & Technology", "Healthcare", "Education", "Design & Creative", 
    "Finance & Banking", "Government", "Startups", "Manufacturing", 
    "Retail & E-commerce", "Consulting", "Media & Entertainment", "Non-profit"
  ];

  const jobRolesBySector = {
    "IT & Technology": [
      "Software Developer", "Data Scientist", "DevOps Engineer", "Cybersecurity Analyst",
      "Product Manager", "Technical Writer", "System Administrator", "Cloud Architect",
      "AI/ML Engineer", "Full Stack Developer", "Mobile App Developer", "Database Administrator"
    ],
    "Healthcare": [
      "Doctor", "Nurse", "Pharmacist", "Medical Researcher", "Healthcare Administrator",
      "Physical Therapist", "Mental Health Counselor", "Biomedical Engineer",
      "Public Health Specialist", "Medical Technologist", "Healthcare Data Analyst"
    ],
    "Education": [
      "Teacher", "Professor", "Educational Administrator", "Curriculum Developer",
      "Educational Technology Specialist", "Student Counselor", "Training Manager",
      "Educational Researcher", "Academic Advisor", "Learning Designer"
    ],
    "Design & Creative": [
      "UX Designer", "UI Designer", "Graphic Designer", "Product Designer",
      "Creative Director", "Art Director", "Web Designer", "Motion Graphics Designer",
      "Brand Designer", "Illustrator", "Photographer", "Video Editor"
    ],
    "Finance & Banking": [
      "Financial Analyst", "Investment Banker", "Risk Manager", "Accountant",
      "Financial Advisor", "Credit Analyst", "Treasury Manager", "Compliance Officer",
      "Portfolio Manager", "Insurance Agent", "Tax Specialist", "Auditor"
    ],
    "Government": [
      "Policy Analyst", "Public Administrator", "Government Relations Specialist",
      "Civil Service Officer", "Public Health Official", "Urban Planner",
      "Diplomat", "Legislative Assistant", "Government Accountant", "Public Safety Officer"
    ],
    "Startups": [
      "Founder/CEO", "Co-founder", "Product Manager", "Growth Hacker",
      "Business Development Manager", "Operations Manager", "Marketing Manager",
      "Sales Manager", "Technical Co-founder", "Startup Consultant"
    ],
    "Manufacturing": [
      "Production Manager", "Quality Assurance Manager", "Industrial Engineer",
      "Supply Chain Manager", "Manufacturing Engineer", "Operations Director",
      "Plant Manager", "Process Engineer", "Safety Manager", "Maintenance Manager"
    ],
    "Retail & E-commerce": [
      "E-commerce Manager", "Retail Manager", "Merchandise Planner", "Supply Chain Analyst",
      "Digital Marketing Manager", "Customer Experience Manager", "Inventory Manager",
      "Store Operations Manager", "E-commerce Specialist", "Retail Buyer"
    ],
    "Consulting": [
      "Management Consultant", "Strategy Consultant", "IT Consultant",
      "Financial Consultant", "HR Consultant", "Operations Consultant",
      "Change Management Consultant", "Business Analyst", "Senior Consultant"
    ],
    "Media & Entertainment": [
      "Content Creator", "Social Media Manager", "Digital Marketing Specialist",
      "Video Producer", "Content Strategist", "Public Relations Manager",
      "Event Manager", "Journalist", "Broadcast Producer", "Entertainment Manager"
    ],
    "Non-profit": [
      "Program Manager", "Grant Writer", "Fundraising Manager", "Volunteer Coordinator",
      "Community Outreach Manager", "Non-profit Administrator", "Advocacy Manager",
      "Development Director", "Social Worker", "Non-profit Consultant"
    ]
  };

  const futurePlans = [
    "Higher Studies", "Job/Employment", "Entrepreneurship", "Research", 
    "Civil Services", "Freelancing", "Others"
  ];

  const skills = [
    "Communication", "Coding/Programming", "Marketing", "Leadership",
    "Data Analysis", "Project Management", "Design", "Public Speaking",
    "Problem Solving", "Teamwork", "Critical Thinking", "Time Management"
  ];

  const workModes = ["Remote", "Hybrid", "On-site"];

  const companyTypes = [
    "Startups", "MNCs", "Government", "NGOs", "Academia", "Consulting Firms"
  ];

  const eventTypes = [
    "Workshops", "Seminars", "Hackathons", "Internships", "Competitions",
    "Mentorship Programs", "Job Fairs", "Networking Events", "Conferences"
  ];

  const availabilityOptions = [
    "Weekdays", "Weekends", "Evenings", "Mornings", "Flexible"
  ];

  const travelOptions = [
    "Local Only", "Within City", "Within State", "Anywhere"
  ];

  const learningStyles = [
    "Visual", "Hands-on", "Group Learning", "Reading", "Audio", "Mixed"
  ];

  const handleMultiSelect = (field, value) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: prev[field].includes(value)
          ? prev[field].filter(item => item !== value)
          : [...prev[field], value]
      };
      
      // If career sectors changed, reset job roles to only include those from selected sectors
      if (field === 'preferredCareerSectors') {
        const availableRoles = getAvailableJobRoles(newData.preferredCareerSectors);
        newData.preferredJobRoles = newData.preferredJobRoles.filter(role => 
          availableRoles.includes(role)
        );
      }
      
      return newData;
    });
    if (touched[field]) {
      setErrors(prev => ({ ...prev, [field]: validateField(field, formData[field], formData) }));
    }
  };

  const getAvailableJobRoles = (selectedSectors) => {
    if (selectedSectors.length === 0) return [];
    
    const allRoles = [];
    selectedSectors.forEach(sector => {
      if (jobRolesBySector[sector]) {
        allRoles.push(...jobRolesBySector[sector]);
      }
    });
    
    // Remove duplicates
    return [...new Set(allRoles)];
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (touched[field]) {
      setErrors(prev => ({ ...prev, [field]: validateField(field, value, formData) }));
    }
  };

  const handleTextArrayChange = (field, value) => {
    const arrayValue = value.split(',').map(item => item.trim()).filter(item => item);
    setFormData(prev => ({
      ...prev,
      [field]: arrayValue
    }));
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const validateAll = () => {
    const needed = [
      'preferredCareerSectors','preferredJobRoles','futurePlan','careerGoals',
      'preferredCompanyType','eventTypesInterested',
      'availabilityPreferences','willingnessToTravel','preferredLearningStyle'
    ];
    const label = {
      preferredCareerSectors: 'Preferred Career Sectors',
      preferredJobRoles: 'Preferred Job Roles',
      futurePlan: 'Future Plan',
      careerGoals: 'Career Goals',
      // preferredWorkMode is optional now
      preferredCompanyType: 'Preferred Company Type',
      eventTypesInterested: 'Event Types Interested',
      availabilityPreferences: 'Availability Preferences',
      willingnessToTravel: 'Willingness to Travel',
      preferredLearningStyle: 'Preferred Learning Style',
    };
    const fieldStep = {
      preferredCareerSectors: 1,
      preferredJobRoles: 1,
      futurePlan: 1,
      careerGoals: 1,
      // preferredWorkMode: 1,
      preferredCompanyType: 1,
      eventTypesInterested: 2,
      availabilityPreferences: 2,
      willingnessToTravel: 2,
      preferredLearningStyle: 3,
    };
    const errs = {};
    for (const f of needed) {
      const m = validateField(f, formData[f], formData);
      if (m) errs[f] = m;
    }
    if (Object.keys(errs).length) {
      setErrors(prev => ({ ...prev, ...errs }));
      setTouched(prev => ({ ...prev, ...Object.keys(errs).reduce((a,k)=> (a[k]=true, a), {}) }));
      const first = Object.keys(errs)[0];
      if (fieldStep[first]) setCurrentStep(fieldStep[first]);
      setTimeout(() => {
        const el = document.querySelector(`[data-field="${first}"]`);
        if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      toast.error(`Please fill: ${label[first]}`);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateAll()) {
      return;
    }
    
    setIsLoading(true);

    const token = localStorage.getItem('token');
    console.log("Token:", token);
    console.log("Submitting onboarding data:", formData);

    try {
      const response = await fetch(`${config.apiBaseUrl}/api/auth/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error:', errorData);
        throw new Error(errorData.error || 'Failed to save onboarding data');
      }

      toast.success("✅ Onboarding completed successfully!");
      onComplete();
    } catch (error) {
      console.error('Onboarding error:', error);
      toast.error("❌ " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6 animate-slideIn">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Career Preferences</h2>
      
      {/* Preferred Career Sectors */}
      <div data-field="preferredCareerSectors">
        <label className="block text-sm font-medium text-gray-600 mb-3">
          Preferred Career Sector(s) *
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {careerSectors.map(sector => (
            <label key={sector} className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200">
              <input
                type="checkbox"
                checked={formData.preferredCareerSectors.includes(sector)}
                onChange={() => handleMultiSelect('preferredCareerSectors', sector)}
                onFocus={() => handleFieldFocus('preferredCareerSectors')}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
              />
              <span className="text-sm text-gray-700">{sector}</span>
            </label>
          ))}
        </div>
        {touched.preferredCareerSectors && errors.preferredCareerSectors && (
          <p className="text-red-500 text-sm mt-1">{errors.preferredCareerSectors}</p>
        )}
      </div>

      {/* Preferred Job Roles */}
      <div data-field="preferredJobRoles">
        <label className="block text-sm font-medium text-gray-600 mb-3">
          Preferred Job Roles / Titles *
          {formData.preferredCareerSectors.length > 0 && (
            <span className="text-xs text-gray-500 ml-2">
              (Based on your selected sectors)
            </span>
          )}
        </label>
        {formData.preferredCareerSectors.length === 0 ? (
          <div className="text-sm text-gray-500 italic p-4 bg-gray-50 rounded-lg border border-gray-200">
            Please select career sectors first to see relevant job roles
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {getAvailableJobRoles(formData.preferredCareerSectors).map(role => (
              <label key={role} className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                <input
                  type="checkbox"
                  checked={formData.preferredJobRoles.includes(role)}
                  onChange={() => handleMultiSelect('preferredJobRoles', role)}
                  onFocus={() => handleFieldFocus('preferredJobRoles')}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-sm text-gray-700">{role}</span>
              </label>
            ))}
          </div>
        )}
        {touched.preferredJobRoles && errors.preferredJobRoles && (
          <p className="text-red-500 text-sm mt-1">{errors.preferredJobRoles}</p>
        )}
      </div>

      {/* Future Plan */}
      <div data-field="futurePlan">
        <label className="block text-sm font-medium text-gray-600 mb-3">
          Future Plan *
        </label>
        <select
          value={formData.futurePlan}
          onChange={(e) => handleInputChange('futurePlan', e.target.value)}
          onFocus={() => handleFieldFocus('futurePlan')}
          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
        >
          <option value="">Select an option</option>
          {futurePlans.map(plan => (
            <option key={plan} value={plan}>{plan}</option>
          ))}
        </select>
        {touched.futurePlan && errors.futurePlan && (
          <p className="text-red-500 text-sm mt-1">{errors.futurePlan}</p>
        )}
      </div>

      {/* Career Goals */}
      <div data-field="careerGoals">
        <label className="block text-sm font-medium text-gray-600 mb-3">
          Career Goals *
        </label>
        <textarea
          value={formData.careerGoals}
          onChange={(e) => handleInputChange('careerGoals', e.target.value)}
          onFocus={() => handleFieldFocus('careerGoals')}
          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
        />
        {touched.careerGoals && errors.careerGoals && (
          <p className="text-red-500 text-sm mt-1">{errors.careerGoals}</p>
        )}
      </div>

      {/* Preferred Work Mode */}
      <div data-field="preferredWorkMode">
        <label className="block text-sm font-medium text-gray-600 mb-2">Preferred Work Mode</label>
        <select
          value={formData.preferredWorkMode}
          onChange={(e) => handleInputChange('preferredWorkMode', e.target.value)}
          onFocus={() => handleFieldFocus('preferredWorkMode')}
          className={`w-full px-4 py-3 bg-white rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-500 transition-all duration-200 border ${touched.preferredWorkMode && !formData.preferredWorkMode ? 'border-red-500' : 'border-gray-300'}`}
        >
          <option value="Remote">Remote</option>
          <option value="On-site">On-site</option>
          <option value="Hybrid">Hybrid</option>
        </select>
      </div>

      {/* Skills to Develop */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-3">
          Top Skills Interested to Develop
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {skills.map(skill => (
            <label key={skill} className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200">
              <input
                type="checkbox"
                checked={formData.skillsToDevelop.includes(skill)}
                onChange={() => handleMultiSelect('skillsToDevelop', skill)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
              />
              <span className="text-sm text-gray-700">{skill}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Preferred Company Type */}
      <div data-field="preferredCompanyType">
        <label className="block text-sm font-medium text-gray-600 mb-3">Preferred Company Type *</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {companyTypes.map(type => (
            <label key={type} className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200">
              <input
                type="checkbox"
                checked={formData.preferredCompanyType.includes(type)}
                onChange={() => handleMultiSelect('preferredCompanyType', type)}
                onFocus={() => handleFieldFocus('preferredCompanyType')}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
              />
              <span className="text-sm text-gray-700">{type}</span>
            </label>
          ))}
        </div>
        {touched.preferredCompanyType && errors.preferredCompanyType && (
          <p className="text-red-500 text-sm mt-1">{errors.preferredCompanyType}</p>
        )}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 animate-slideIn">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Personal Interests and Preferences</h2>
      
      {/* Hobbies */}
      <div data-field="hobbies">
        <label className="block text-sm font-medium text-gray-600 mb-2">Hobbies</label>
        <input
          type="text"
          value={rawHobbiesText}
          onChange={(e) => setRawHobbiesText(e.target.value)}
          onBlur={() => handleTextArrayChange('hobbies', rawHobbiesText)}
          placeholder="List your hobbies..."
          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
        />
      </div>

      {/* Event Types Interested */}
      <div data-field="eventTypesInterested">
        <label className="block text-sm font-medium text-gray-600 mb-3">
          Event Types Interested *
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {eventTypes.map(event => (
            <label key={event} className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200">
              <input
                type="checkbox"
                checked={formData.eventTypesInterested.includes(event)}
                onChange={() => handleMultiSelect('eventTypesInterested', event)}
                onFocus={() => handleFieldFocus('eventTypesInterested')}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
              />
              <span className="text-sm text-gray-700">{event}</span>
            </label>
          ))}
        </div>
        {touched.eventTypesInterested && errors.eventTypesInterested && (
          <p className="text-red-500 text-sm mt-1">{errors.eventTypesInterested}</p>
        )}
      </div>

      {/* Availability Preferences */}
      <div data-field="availabilityPreferences">
        <label className="block text-sm font-medium text-gray-600 mb-3">
          Availability Preferences *
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {availabilityOptions.map(option => (
            <label key={option} className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200">
              <input
                type="checkbox"
                checked={formData.availabilityPreferences.includes(option)}
                onChange={() => handleMultiSelect('availabilityPreferences', option)}
                onFocus={() => handleFieldFocus('availabilityPreferences')}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
              />
              <span className="text-sm text-gray-700">{option}</span>
            </label>
          ))}
        </div>
        {touched.availabilityPreferences && errors.availabilityPreferences && (
          <p className="text-red-500 text-sm mt-1">{errors.availabilityPreferences}</p>
        )}
      </div>

      {/* Willingness to Travel */}
      <div data-field="willingnessToTravel">
        <label className="block text-sm font-medium text-gray-600 mb-3">
          Willingness to Travel *
        </label>
        <select
          value={formData.willingnessToTravel}
          onChange={(e) => handleInputChange('willingnessToTravel', e.target.value)}
          onFocus={() => handleFieldFocus('willingnessToTravel')}
          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
        >
          <option value="">Select an option</option>
          {travelOptions.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        {touched.willingnessToTravel && errors.willingnessToTravel && (
          <p className="text-red-500 text-sm mt-1">{errors.willingnessToTravel}</p>
        )}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6 animate-slideIn">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Advanced Preferences</h2>
      
      {/* Preferred Learning Style */}
      <div data-field="preferredLearningStyle">
        <label className="block text-sm font-medium text-gray-600 mb-3">
          Preferred Learning Style *
        </label>
        <select
          value={formData.preferredLearningStyle}
          onChange={(e) => handleInputChange('preferredLearningStyle', e.target.value)}
          onFocus={() => handleFieldFocus('preferredLearningStyle')}
          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
        >
          <option value="">Select an option</option>
          {learningStyles.map(style => (
            <option key={style} value={style}>{style}</option>
          ))}
        </select>
        {touched.preferredLearningStyle && errors.preferredLearningStyle && (
          <p className="text-red-500 text-sm mt-1">{errors.preferredLearningStyle}</p>
        )}
      </div>

      {/* Peer Groups */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-3">
          Peer Groups
        </label>
        <input
          type="text"
          value={formData.peerGroups.join(', ')}
          onChange={(e) => handleTextArrayChange('peerGroups', e.target.value)}
          placeholder="List communities or groups you're part of..."
          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-lg p-8 animate-fadeIn">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 animate-slideIn">
            Welcome to Your Journey! 🚀
          </h1>
          <p className="text-gray-600">
            Help us personalize your experience by sharing your preferences
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Step {currentStep} of 3</span>
            <span>{Math.round((currentStep / 3) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            ></div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}

          <div className="flex justify-between mt-8">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
            >
              Previous
            </button>
            
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                {isLoading ? "Saving..." : "Complete Onboarding"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentOnboarding;
