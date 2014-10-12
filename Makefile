BIN = ./node_modules/.bin

all: clean dist/rtc.js dist/rtc.min.js

clean:
	@rm -rf dist

dist:
	@mkdir -p dist

dist/rtc.js: dist
	@echo "building rtc.js"
	@$(BIN)/browserify -d -s RTC index.js > dist/rtc.js

dist/rtc.min.js: dist/rtc.js
	@echo "building rtc.min.js"
	@$(BIN)/uglifyjs < dist/rtc.js > dist/rtc.min.js
	@echo "build complete minified version = `wc -c < dist/rtc.min.js` bytes"
