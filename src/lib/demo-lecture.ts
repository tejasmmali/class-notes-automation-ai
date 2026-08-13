/*
  Demo content for the lecture result page.

  This is placeholder UI data so the interface can be designed and reviewed
  independently of a real lecture. It is NOT AI output and is labelled as sample
  content in the UI. The shapes are the same ones the real pipeline produces, so
  the note components render both without branching.
*/

import type { NoteSection } from "@/components/full-notes";
import type { Concept } from "@/components/lecture-sections";
import type { Definition, ExamQuestion } from "@/lib/notes-view";

export const lecture = {
  subject: "Automation & Robotics",
  title: "Sensors",
  teacher: "Dr. Anita Rao",
  date: "8 August 2026",
  duration: "48 min",
};

export const quickSummary =
  "A sensor detects a physical quantity such as temperature, pressure, position, or light and converts it into a usable signal.";

export const signalChain = [
  { label: "Physical world", detail: "Heat, force, motion, light" },
  { label: "Sensor", detail: "Detects and converts" },
  { label: "Signal", detail: "Voltage, current, or bits" },
  { label: "Controller", detail: "Decides and acts" },
];

export const fullNotes: NoteSection[] = [
  {
    heading: "What is a sensor?",
    body: [
      "A **sensor** is a device that responds to a physical quantity in its environment and converts that quantity into a signal a control system can read. The quantity being measured is called the **measurand** — temperature, pressure, displacement, light intensity, and so on.",
      "The teacher stressed the direction of the conversion: a sensor takes energy from the physical world and turns it into information. An actuator does the reverse, turning a control decision back into physical action. Together they close the loop in an automated system.",
    ],
  },
  {
    heading: "Classification of sensors",
    body: [
      "Sensors were grouped three ways during the lecture. The same device can appear in more than one group, so these are lenses rather than boxes.",
    ],
    list: [
      "**By measurand** — thermal, mechanical, optical, magnetic, chemical.",
      "**By output signal** — analog or digital.",
      "**By power requirement** — active or passive.",
    ],
  },
  {
    heading: "Analog vs digital sensors",
    body: [
      "An **analog sensor** produces a continuously varying output. A thermocouple's output voltage rises smoothly as temperature rises, so between any two readings there are infinitely many intermediate values. To reach a microcontroller, that signal must pass through an **ADC** (analog-to-digital converter).",
      "A **digital sensor** produces a discrete output — either a simple on/off state or an encoded digital word. A rotary encoder emitting pulses as a shaft turns is the example given in class. Digital output resists noise better over long cable runs, because a degraded pulse is still readable as a pulse.",
    ],
  },
  {
    heading: "Active vs passive sensors",
    body: [
      "An **active sensor** requires an external power supply to operate. A strain gauge is passive in isolation but is typically driven in a powered bridge circuit; an ultrasonic sensor actively emits a pulse and listens for the echo.",
      "A **passive sensor** generates its own output from the energy of the measurand itself, needing no excitation supply. A thermocouple produces a voltage directly from a temperature difference, and a photovoltaic cell produces current directly from incident light.",
    ],
  },
  {
    heading: "Applications",
    body: [
      "The closing section connected the taxonomy to working systems, emphasising that sensor choice is driven by the environment as much as by the quantity measured.",
    ],
    list: [
      "**Industrial automation** — proximity sensors for part detection on a conveyor line.",
      "**Robotics** — encoders for joint position, force sensors for grip control.",
      "**Automotive** — oxygen sensors for fuel mixture, wheel-speed sensors for ABS.",
      "**Consumer devices** — accelerometers for screen orientation, ambient light sensors for display brightness.",
    ],
  },
];

export const keyConcepts: Concept[] = [
  {
    term: "Measurand",
    note: "The physical quantity the sensor is measuring.",
  },
  {
    term: "Transduction",
    note: "Converting one form of energy into another.",
  },
  {
    term: "Range",
    note: "The minimum and maximum the sensor can measure.",
  },
  {
    term: "Sensitivity",
    note: "Output change per unit change of the measurand.",
  },
  {
    term: "Resolution",
    note: "The smallest change the sensor can distinguish.",
  },
  {
    term: "Accuracy",
    note: "How close a reading is to the true value.",
  },
  {
    term: "Calibration",
    note: "Correcting readings against a known reference.",
  },
  {
    term: "Response time",
    note: "How quickly the output settles after a change.",
  },
];

export const definitions: Definition[] = [
  {
    term: "Sensor",
    meaning:
      "A device that detects a physical quantity and converts it into a signal that can be read by an observer or an instrument.",
  },
  {
    term: "Transducer",
    meaning:
      "Any device that converts energy from one form to another. Every sensor is a transducer, but not every transducer is a sensor.",
  },
  {
    term: "Actuator",
    meaning:
      "A device that converts a control signal into physical action, such as a motor or a valve. It is the output counterpart of a sensor.",
  },
  {
    term: "ADC",
    meaning:
      "Analog-to-digital converter. Samples a continuous analog signal and represents it as discrete numeric values for a digital system.",
  },
  {
    term: "Hysteresis",
    meaning:
      "The difference in output for the same input depending on whether the measurand is rising or falling.",
  },
  {
    term: "Drift",
    meaning:
      "A gradual change in output over time when the measurand has not changed, usually caused by temperature or ageing.",
  },
];

export const examples = [
  "A thermocouple's output voltage rising smoothly as temperature rises — the analog example used in class.",
  "A rotary encoder emitting pulses as a shaft turns, given as the digital counterpart.",
  "An ultrasonic sensor emitting a pulse and listening for the echo, used to show an active sensor.",
  "A photovoltaic cell producing current directly from incident light, used to show a passive sensor.",
  "Proximity sensors detecting parts on a conveyor line, the industrial application discussed at the end.",
];

export const importantPoints = [
  "A sensor converts a physical quantity into a signal; an actuator converts a signal back into physical action.",
  "Analog output is continuous and needs an ADC. Digital output is discrete and travels better over distance.",
  "Active sensors need an excitation supply. Passive sensors generate output from the measurand's own energy.",
  "Accuracy and resolution are not the same: a sensor can report fine increments and still be consistently wrong.",
  "Calibration is what makes a reading trustworthy — an uncalibrated sensor gives precise numbers with no guarantee they are correct.",
];

export const examQuestions: ExamQuestion[] = [
  {
    question:
      "Define a sensor and explain how it differs from a transducer and an actuator.",
    importance: "very important",
  },
  {
    question:
      "Compare analog and digital sensors with one example of each, and state where an ADC is required.",
    importance: "high priority",
  },
  {
    question:
      "Distinguish between active and passive sensors, giving one example of each.",
    importance: "very important",
  },
  {
    question:
      "Explain the difference between accuracy, resolution, and sensitivity.",
    importance: "high priority",
  },
  {
    question: "Describe three classifications of sensors with examples.",
    importance: "important",
  },
  {
    question:
      "Why does a digital output resist noise better than an analog output over a long cable run?",
    importance: "important",
  },
];

export const revisionPoints = [
  "Sensor = physical quantity → readable signal.",
  "Measurand = the thing being measured.",
  "Analog = continuous, needs ADC. Digital = discrete, noise-resistant.",
  "Active = needs power supply. Passive = self-generating.",
  "Thermocouple = passive + analog. Encoder = digital.",
  "Accuracy = closeness to truth. Resolution = smallest step.",
  "Sensitivity = output change ÷ input change.",
  "Calibration corrects against a known reference.",
  "Actuator = the reverse of a sensor.",
  "Sensor + actuator = closed control loop.",
];

export const suggestedPrompts = [
  "Explain sensors simply",
  "Give me an example",
  "Compare analog and digital sensors",
  "Create 5 MCQs",
];

/*
  Sample transcript for the design preview. Hand-written to read like real
  speech-to-text output (one running block of sentences, the shape Whisper
  actually stores) so the Real Transcript section can be reviewed with realistic
  material. Not AI output.
*/
export const transcript =
  "Okay, so today we are going to talk about sensors, which are one of the most " +
  "important building blocks in any automation or robotics system. Let's start " +
  "with the basic idea. A sensor is a device that detects some physical quantity " +
  "from the environment and converts it into a signal that a control system can " +
  "actually read. That physical quantity we call the measurand. It could be " +
  "temperature, it could be pressure, position, light intensity, and so on. Now " +
  "notice the direction here. The sensor takes energy from the physical world and " +
  "turns it into information. The actuator does the opposite. It takes a control " +
  "decision and turns it back into physical action. Together the sensor and the " +
  "actuator close the loop in an automated system. Next let's look at how we " +
  "classify sensors. We can group them in three main ways. First by the measurand, " +
  "so thermal, mechanical, optical, magnetic, chemical. Second by the output " +
  "signal, which is either analog or digital. And third by the power requirement, " +
  "which is active or passive. Keep in mind the same device can fall into more " +
  "than one group, so these are really just different lenses. Let's talk about " +
  "analog versus digital. An analog sensor gives you a continuously varying " +
  "output. A thermocouple is a good example. Its output voltage rises smoothly as " +
  "the temperature rises. To get that into a microcontroller you need an ADC, an " +
  "analog to digital converter. A digital sensor on the other hand gives you a " +
  "discrete output. A rotary encoder that emits pulses as a shaft turns is the " +
  "example I want you to remember. Digital output resists noise much better over " +
  "long cable runs. Now active versus passive. An active sensor needs an external " +
  "power supply to operate, while a passive sensor generates its own output from " +
  "the energy of the measurand itself. A thermocouple is passive, it produces a " +
  "voltage directly from a temperature difference. Finally, applications. In " +
  "industrial automation we use proximity sensors to detect parts on a conveyor. " +
  "In robotics we use encoders for joint position and force sensors for grip " +
  "control. So remember, the choice of sensor is driven by the environment as much " +
  "as by the quantity you are measuring. That's it for today.";

