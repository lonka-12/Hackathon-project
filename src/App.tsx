import { useState } from "react";
import "./App.css";

interface Skill {
  name: string;
  importance: "High" | "Medium" | "Low";
  description: string;
}

interface LearningStep {
  title: string;
  description: string;
  duration: string;
}

interface Course {
  title: string;
  platform: string;
  rating: number;
  price: string;
  url: string;
}

function App() {
  const [careerGoal, setCareerGoal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [learningPath, setLearningPath] = useState<LearningStep[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  const handleAnalyze = async () => {
    if (!careerGoal.trim()) {
      alert("Please enter a career goal");
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement API calls
      // For now, using mock data
      setSkills([
        {
          name: "Technical Skills",
          importance: "High",
          description: "Core technical competencies required for the role",
        },
      ]);
      setLearningPath([
        {
          title: "Foundation",
          description: "Build basic knowledge and skills",
          duration: "3-6 months",
        },
      ]);
      setCourses([
        {
          title: "Introduction to Programming",
          platform: "Coursera",
          rating: 4.8,
          price: "Free",
          url: "#",
        },
      ]);
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred while analyzing your career path");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🧠 AI Skill Gap Analyzer</h1>
        <p className="subtitle">Discover your learning path to success</p>
      </header>

      <main className="app-main">
        <section className="input-section">
          <div className="search-container">
            <input
              type="text"
              value={careerGoal}
              onChange={(e) => setCareerGoal(e.target.value)}
              placeholder="Enter your career goal (e.g., 'Software Engineer')"
              className="career-input"
            />
            <button
              onClick={handleAnalyze}
              disabled={isLoading}
              className="analyze-button"
            >
              {isLoading ? "Analyzing..." : "Analyze Skills"}
            </button>
          </div>
        </section>

        {isLoading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Analyzing your career path...</p>
          </div>
        )}

        {!isLoading &&
          (skills.length > 0 ||
            learningPath.length > 0 ||
            courses.length > 0) && (
            <section className="results-section">
              <div className="skill-gap-analysis">
                <h2>Skill Gap Analysis</h2>
                <div className="skills-grid">
                  {skills.map((skill, index) => (
                    <div key={index} className="skill-card">
                      <h3>{skill.name}</h3>
                      <p
                        className={`importance ${skill.importance.toLowerCase()}`}
                      >
                        {skill.importance}
                      </p>
                      <p>{skill.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="learning-path">
                <h2>Recommended Learning Path</h2>
                <div className="path-timeline">
                  {learningPath.map((step, index) => (
                    <div key={index} className="timeline-step">
                      <div className="timeline-marker"></div>
                      <div className="timeline-content">
                        <h3>{step.title}</h3>
                        <p>{step.description}</p>
                        <span className="timeline-duration">
                          {step.duration}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="course-recommendations">
                <h2>Course Recommendations</h2>
                <div className="courses-grid">
                  {courses.map((course, index) => (
                    <div key={index} className="course-card">
                      <h3>{course.title}</h3>
                      <p className="platform">{course.platform}</p>
                      <div className="rating">
                        <span className="stars">
                          {"★".repeat(Math.floor(course.rating))}
                        </span>
                        <span className="rating-value">{course.rating}</span>
                      </div>
                      <p className="price">{course.price}</p>
                      <a
                        href={course.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="course-link"
                      >
                        Learn More
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
      </main>

      <footer className="app-footer">
        <p>Powered by AI to help you achieve your career goals</p>
      </footer>
    </div>
  );
}

export default App;
