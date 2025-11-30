"use client";

import { cn } from "@/lib/utils";

interface PadelBallLoaderProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function PadelBallLoader({ className, size = "md" }: PadelBallLoaderProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-11 h-11",
    lg: "w-16 h-16",
  };

  return (
    <>
      <style jsx global>{`
        @keyframes padel-bounce {
          0% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-45px) scale(0.92);
          }
          100% {
            transform: translateY(0) scale(1);
          }
        }
        .padel-ball-animation {
          animation: padel-bounce 0.9s cubic-bezier(0.34, 0, 0.65, 1) infinite;
        }
      `}</style>
      <div className={cn("flex flex-col items-center justify-center", className)}>
        <div className={cn("relative padel-ball-animation", sizeClasses[size])}>
          <svg
            viewBox="0 0 2200 2200"
            className="w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
            xmlnsXlink="http://www.w3.org/1999/xlink"
          >
            <g id="Objects">
              <g>
                <g>
                  <circle
                    style={{ fill: "#C3D415" }}
                    cx="1100"
                    cy="1021.416"
                    r="792.159"
                  />
                  <path
                    style={{ fill: "#EAE6C7" }}
                    d="M1308.505,1530.371c-75.95,26.467-175.49,29.189-273.106,7.46
                      c-80.334-17.883-197.933-61.037-301.942-165.046c-85.85-85.85-144.108-191.527-168.468-305.604
                      c-20.054-93.876-16.087-192.086,10.868-269.457c30.236-86.776,96.577-168.419,197.184-242.665
                      c43.579-32.166,89.704-60.67,134.315-88.24c38.156-23.575,77.605-47.963,114.41-74.062
                      c64.234-45.538,123.178-98.26,176.14-157.459c26.905,3.33,53.677,8.04,80.2,14.128
                      c-63.406,76.431-135.779,143.656-215.851,200.436c-38.608,27.379-79.019,52.347-118.094,76.502
                      c-43.409,26.821-88.289,54.56-129.556,85.008c-89.046,65.726-147.135,136.175-172.647,209.388
                      c-22.854,65.605-25.958,150.098-8.514,231.804c21.531,100.826,73.235,194.447,149.511,270.723
                      c92.101,92.101,196.392,130.348,267.654,146.215c84.004,18.696,171.813,16.744,234.866-5.225
                      c73.221-25.52,143.663-83.601,209.388-172.647c30.448-41.267,58.181-86.154,85.008-129.556
                      c24.155-39.075,49.123-79.486,76.502-118.094c59.128-83.396,129.577-158.413,209.961-223.679
                      c6.725,25.689,12.127,51.654,16.221,77.782c-63.93,55.572-120.583,117.981-169.076,186.386
                      c-26.099,36.805-50.487,76.254-74.055,114.403c-27.57,44.611-56.081,90.743-88.24,134.315
                      C1476.93,1433.801,1395.288,1500.142,1308.505,1530.371z"
                  />
                </g>
                <ellipse
                  style={{ fill: "#D6D6D6" }}
                  cx="1100"
                  cy="1946.19"
                  rx="595.323"
                  ry="24.552"
                />
              </g>
            </g>
          </svg>
        </div>
      </div>
    </>
  );
}

