import { createContext, FunctionComponent, ReactNode, useState, useCallback } from 'react';
import { ThemeProvider } from 'styled-components';
import { getThemePreference, setLocalStorage } from './utils';
import { dark, light } from './config/theme';
import { MetaMaskProvider } from './hooks';
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";
import { PageThemeContext, ThemeContract } from './utils/ThemeContract';

export type RootProps = {
  children: ReactNode;
};

type ToggleTheme = () => void;

export const ToggleThemeContext = createContext<ToggleTheme>(
  (): void => undefined,
);

export const Root: FunctionComponent<RootProps> = ({ children }) => {
  const [darkTheme, setDarkTheme] = useState(getThemePreference());
  const [pageTheme, setPageTheme] = useState(ThemeContract.Dark);

  const toggleTheme: ToggleTheme = () => {
    setLocalStorage('theme', darkTheme ? 'light' : 'dark');
    setDarkTheme(!darkTheme);
  };

  const particlesInit = useCallback(async (engine:any) => {
    console.log(engine);
    // you can initiate the tsParticles instance (engine) here, adding custom shapes or presets
    // this loads the tsparticles package bundle, it's the easiest method for getting everything ready
    // starting from v2 you can add only the features you need reducing the bundle size
    await loadFull(engine);
  }, []);

  const particlesLoaded = useCallback(async (container:any) => {
    await console.log(container);
  }, []);

  return (
    <PageThemeContext.Provider value={{
      theme: pageTheme,
      setTheme: (newTheme) => {setPageTheme(newTheme)}
      }}>
      <Particles
            id="tsparticles"
            init={particlesInit}
            loaded={particlesLoaded}
            options={{
              "autoPlay": true,
              "background": {
                "color": {
                  "value": "#111"
                },
                
                "position": "50% 50%",
                "repeat": "no-repeat",
                "size": "20%",
                "opacity": 1
              },
              "backgroundMask": {
                "composite": "destination-out",
                "cover": {
                  "color": {
                    "value": "#fff"
                  },
                  "opacity": 1
                },
                "enable": false
              },
              "defaultThemes": {},
              "delay": 0,
              "fullScreen": {
                "enable": true,
                "zIndex": 0
              },
              "detectRetina": true,
              "duration": 0,
              "fpsLimit": 60,
              "interactivity": {
                "detectsOn": "window",
                "events": {
                  "onClick": {
                    "enable": true,
                    "mode": "repulse"
                  },
                  "onDiv": {
                    "selectors": [],
                    "enable": false,
                    "mode": [],
                    "type": "circle"
                  },
                  "onHover": {
                    "enable": true,
                    "mode": "bubble",
                    "parallax": {
                      "enable": false,
                      "force": 2,
                      "smooth": 10
                    }
                  },
                  "resize": {
                    "delay": 0.5,
                    "enable": true
                  }
                },
                "modes": {
                  "attract": {
                    "distance": 200,
                    "duration": 0.4,
                    "easing": "ease-out-quad",
                    "factor": 1,
                    "maxSpeed": 50,
                    "speed": 1
                  },
                  "bounce": {
                    "distance": 200
                  },
                  "bubble": {
                    "distance": 250,
                    "duration": 2,
                    "mix": false,
                    "opacity": 0,
                    "size": 0,
                    "divs": {
                      "distance": 200,
                      "duration": 0.4,
                      "mix": false,
                      "selectors": []
                    }
                  },
                  "connect": {
                    "distance": 80,
                    "links": {
                      "opacity": 0.5
                    },
                    "radius": 60
                  },
                  "grab": {
                    "distance": 400,
                    "links": {
                      "blink": false,
                      "consent": false,
                      "opacity": 1
                    }
                  },
                  "push": {
                    "default": true,
                    "groups": [],
                    "quantity": 4
                  },
                  "remove": {
                    "quantity": 2
                  },
                  "repulse": {
                    "distance": 400,
                    "duration": 0.4,
                    "factor": 100,
                    "speed": 1,
                    "maxSpeed": 50,
                    "easing": "ease-out-quad",
                    "divs": {
                      "distance": 200,
                      "duration": 0.4,
                      "factor": 100,
                      "speed": 1,
                      "maxSpeed": 50,
                      "easing": "ease-out-quad",
                      "selectors": []
                    }
                  },
                  "slow": {
                    "factor": 3,
                    "radius": 200
                  },
                  "trail": {
                    "delay": 1,
                    "pauseOnStop": false,
                    "quantity": 1
                  },
                  "light": {
                    "area": {
                      "gradient": {
                        "start": {
                          "value": "#ffffff"
                        },
                        "stop": {
                          "value": "#000000"
                        }
                      },
                      "radius": 1000
                    },
                    "shadow": {
                      "color": {
                        "value": "#000000"
                      },
                      "length": 2000
                    }
                  }
                }
              },
              "manualParticles": [],
              "particles": {
                "bounce": {
                  "horizontal": {
                    "random": {
                      "enable": false,
                      "minimumValue": 0.1
                    },
                    "value": 1
                  },
                  "vertical": {
                    "random": {
                      "enable": false,
                      "minimumValue": 0.1
                    },
                    "value": 1
                  }
                },
                "collisions": {
                  "absorb": {
                    "speed": 2
                  },
                  "bounce": {
                    "horizontal": {
                      "random": {
                        "enable": false,
                        "minimumValue": 0.1
                      },
                      "value": 1
                    },
                    "vertical": {
                      "random": {
                        "enable": false,
                        "minimumValue": 0.1
                      },
                      "value": 1
                    }
                  },
                  "enable": false,
                  "mode": "bounce",
                  "overlap": {
                    "enable": true,
                    "retries": 0
                  }
                },
                "color": {
                  "value": "#4e3d7c",
                  "animation": {
                    "h": {
                      "count": 0,
                      "enable": false,
                      "offset": 0,
                      "speed": 1,
                      "decay": 0,
                      "sync": true
                    },
                    "s": {
                      "count": 0,
                      "enable": false,
                      "offset": 0,
                      "speed": 1,
                      "decay": 0,
                      "sync": true
                    },
                    "l": {
                      "count": 0,
                      "enable": false,
                      "offset": 0,
                      "speed": 1,
                      "decay": 0,
                      "sync": true
                    }
                  }
                },
                "groups": {},
                "move": {
                  "angle": {
                    "offset": 0,
                    "value": 90
                  },
                  "attract": {
                    "distance": 200,
                    "enable": false,
                    "rotate": {
                      "x": 600,
                      "y": 600
                    }
                  },
                  "center": {
                    "x": 50,
                    "y": 50,
                    "mode": "percent",
                    "radius": 0
                  },
                  "decay": 0,
                  "distance": {},
                  "direction": "none",
                  "drift": 0,
                  "enable": true,
                  "gravity": {
                    "acceleration": 9.81,
                    "enable": false,
                    "inverse": false,
                    "maxSpeed": 50
                  },
                  "path": {
                    "clamp": true,
                    "delay": {
                      "random": {
                        "enable": false,
                        "minimumValue": 0
                      },
                      "value": 0
                    },
                    "enable": false,
                    "options": {}
                  },
                  "outModes": {
                    "default": "out",
                    "bottom": "out",
                    "left": "out",
                    "right": "out",
                    "top": "out"
                  },
                  "random": true,
                  "size": false,
                  "speed": 1,
                  "spin": {
                    "acceleration": 0,
                    "enable": false
                  },
                  "straight": false,
                  "trail": {
                    "enable": false,
                    "length": 10,
                    "fill": {}
                  },
                  "vibrate": false,
                  "warp": false
                },
                "number": {
                  "density": {
                    "enable": true,
                    "width": 1920,
                    "height": 1080
                  },
                  "limit": 0,
                  "value": 160
                },
                "opacity": {
                  "random": {
                    "enable": true,
                    "minimumValue": 0.1
                  },
                  "value": {
                    "min": 0,
                    "max": 1
                  },
                  "animation": {
                    "count": 0,
                    "enable": true,
                    "speed": 1,
                    "decay": 0,
                    "sync": false,
                    "destroy": "none",
                    "startValue": "random",
                    "minimumValue": 0
                  }
                },
                "reduceDuplicates": false,
                "shadow": {
                  "blur": 0,
                  "color": {
                    "value": "#000"
                  },
                  "enable": false,
                  "offset": {
                    "x": 0,
                    "y": 0
                  }
                },
                "shape": {
                  "options": {},
                  "type": "circle"
                },
                "size": {
                  "random": {
                    "enable": true,
                    "minimumValue": 1
                  },
                  "value": {
                    "min": 5,
                    "max": 10
                  },
                  "animation": {
                    "count": 0,
                    "enable": false,
                    "speed": 4,
                    "decay": 0,
                    "sync": false,
                    "destroy": "none",
                    "startValue": "random",
                    "minimumValue": 0.3
                  }
                },
                "stroke": {
                  "width": 0
                },
                "zIndex": {
                  "random": {
                    "enable": false,
                    "minimumValue": 0
                  },
                  "value": 0,
                  "opacityRate": 1,
                  "sizeRate": 1,
                  "velocityRate": 1
                },
                "life": {
                  "count": 0,
                  "delay": {
                    "random": {
                      "enable": false,
                      "minimumValue": 0
                    },
                    "value": 0,
                    "sync": false
                  },
                  "duration": {
                    "random": {
                      "enable": false,
                      "minimumValue": 0.0001
                    },
                    "value": 0,
                    "sync": false
                  }
                },
                "rotate": {
                  "random": {
                    "enable": false,
                    "minimumValue": 0
                  },
                  "value": 0,
                  "animation": {
                    "enable": false,
                    "speed": 0,
                    "decay": 0,
                    "sync": false
                  },
                  "direction": "clockwise",
                  "path": false
                },
                "destroy": {
                  "bounds": {},
                  "mode": "none",
                  "split": {
                    "count": 1,
                    "factor": {
                      "random": {
                        "enable": false,
                        "minimumValue": 0
                      },
                      "value": 3
                    },
                    "rate": {
                      "random": {
                        "enable": false,
                        "minimumValue": 0
                      },
                      "value": {
                        "min": 4,
                        "max": 9
                      }
                    },
                    "sizeOffset": true,
                    "particles": {}
                  }
                },
                "roll": {
                  "darken": {
                    "enable": false,
                    "value": 0
                  },
                  "enable": false,
                  "enlighten": {
                    "enable": false,
                    "value": 0
                  },
                  "mode": "vertical",
                  "speed": 25
                },
                "tilt": {
                  "random": {
                    "enable": false,
                    "minimumValue": 0
                  },
                  "value": 0,
                  "animation": {
                    "enable": false,
                    "speed": 0,
                    "decay": 0,
                    "sync": false
                  },
                  "direction": "clockwise",
                  "enable": false
                },
                "twinkle": {
                  "lines": {
                    "enable": false,
                    "frequency": 0.05,
                    "opacity": 1
                  },
                  "particles": {
                    "enable": false,
                    "frequency": 0.05,
                    "opacity": 1
                  }
                },
                "wobble": {
                  "distance": 5,
                  "enable": false,
                  "speed": {
                    "angle": 50,
                    "move": 10
                  }
                },
                "orbit": {
                  "animation": {
                    "count": 0,
                    "enable": false,
                    "speed": 1,
                    "decay": 0,
                    "sync": false
                  },
                  "enable": false,
                  "opacity": 1,
                  "rotation": {
                    "random": {
                      "enable": false,
                      "minimumValue": 0
                    },
                    "value": 45
                  },
                  "width": 1
                },
                "links": {
                  "blink": false,
                  "color": {
                    "value": "#ffffff"
                  },
                  "consent": false,
                  "distance": 150,
                  "enable": false,
                  "frequency": 1,
                  "opacity": 0.4,
                  "shadow": {
                    "blur": 5,
                    "color": {
                      "value": "#000"
                    },
                    "enable": false
                  },
                  "triangles": {
                    "enable": false,
                    "frequency": 1
                  },
                  "width": 1,
                  "warp": false
                },
                "repulse": {
                  "random": {
                    "enable": false,
                    "minimumValue": 0
                  },
                  "value": 0,
                  "enabled": false,
                  "distance": 1,
                  "duration": 1,
                  "factor": 1,
                  "speed": 1
                }
              },
              "pauseOnBlur": true,
              "pauseOnOutsideViewport": true,
              "responsive": [],
              "smooth": false,
              "style": {},
              "themes": [],
              "zLayers": 100
            }}
        />
      <ToggleThemeContext.Provider value={toggleTheme}>
        <ThemeProvider theme={darkTheme ? dark : light}>
          <MetaMaskProvider>{children}</MetaMaskProvider>
        </ThemeProvider>
      </ToggleThemeContext.Provider>
    </PageThemeContext.Provider>
  );
};
