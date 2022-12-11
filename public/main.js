let width = screen.width;
let height = screen.height;
let mapWidth = d3.select("#map_div").node().clientWidth;
let mapHeight = height * 0.6;
var margin = { top: 10, right: 40, bottom: 50, left: 60 };
let chartWidth = (width - mapWidth) / 2;
let chartHeight = (height) / 3 - margin.top - margin.bottom;

//variable containing reference to events
var events, positions;
var svg, projection, textArea, types, regions;
var regions_num_events, topRegions, selectedRegion, previousSelectedRegion;
var color, size, allTypes;
var svg2, svg3, g, path, x2;
var dateBegin, dateEnd;
var barplot_data;

d3.csv("./public/Ukraine_Black_Sea_2020_2022_Dec02.csv")
  .row(function (d) {
    var parseDate = d3.timeParse("%d-%B-%Y");
    return {
      date: parseDate(d['EVENT_DATE']),
      year: +d["YEAR"],
      event_type: d["EVENT_TYPE"],
      sub_event_type: d["SUB_EVENT_TYPE"],
      actor1: d["ACTOR1"],
      actor2: d["ACTOR2"],
      admin1: d["ADMIN1"],
      admin2: d["ADMIN2"],
      admin3: d["ADMIN3"],
      location: d["LOCATION"],
      lat: +d["LATITUDE"],
      long: +d["LONGITUDE"],
      notes: d["NOTES"],
      fatalities: d["FATALITIES"],
      timestamp: d["TIMESTAMP"]
    };
  }).get(function (error, rows) {
    //saving reference to data
    events = rows;
    console.log(events)

    //load map and initialise the views
    init();
    drawMap();
    // data visualization
    visualization();

  });

var line_chart_data = function (d, lineChartRegion) {
  let dates = d.map(a => a.date);
  dates = d3.set(dates).values();

  let result = [];
  for (let i = 0; i < dates.length; i++) {
    let record = {
      date: new Date(dates[i])
    }
    for (let t = 0; t < types.length; t++) {
      if (lineChartRegion != '')
        var newArray = [d.filter(x =>
          x.event_type == types[t] &&
          x.date == dates[i] && x.admin1 == lineChartRegion)]
      else
        var newArray = [d.filter(x =>
          x.event_type == types[t] &&
          x.date == dates[i])];
      record[types[t]] = newArray[0].length;
    }
    result.push(record);
  }
  return result;
}
var findTopRegions = function (d) {
  regions_num_events = [];
  for (let i = 0; i < regions.length; i++) {

    let rec2 = {
      region: regions[i]
    };
    var newArray = [d.filter(x =>
      x.admin1 == rec2.region && x.date <= dateEnd && x.date >= dateBegin)]
    rec2.num_events = newArray[0].length;
    regions_num_events.push(rec2);
  }
  topRegions = regions_num_events.sort(function (a, b) {
    return d3.descending(+a.num_events, +b.num_events);

  }).slice(0, 10);
  return topRegions = topRegions.map(function (d) { return d.region })

}
var barplot_data_func = function (d, region) {
  let result = [];

  for (let i = 0; i < region.length; i++) {
    let record = {
      region: region[i]
    }
    for (let t = 0; t < types.length; t++) {
      var newArray2 = [d.filter(x =>
        x.admin1 == record.region && x.event_type == types[t] && x.date <= dateEnd && x.date >= dateBegin)];
      record[types[t]] = newArray2[0].length;
    }

    result.push(record);
  }

  return result;
}
var map_data_func = function (d) {
  let result = [];

  for (let i = 0; i < positions.length; i++) {

    var total = 0;
    for (let t = 0; t < types.length; t++) {
      var newArray2 = [d.filter(x =>
        x.long == positions[i].long && x.lat == positions[i].lat && x.event_type == types[t] && x.date <= dateEnd && x.date >= dateBegin)];
      let record = {
        lat: positions[i].lat,
        long: positions[i].long,
        event_type: types[t],
        num_events: newArray2[0].length
      }
      result.push(record);
      // record[types[t]] = newArray2[0].length;
      // total = total + newArray2[0].length;
    }
    // record.total_events = total;

  }

  return result;
}
function init() {
  selectedRegion = ''
  previousSelectedRegion = ''
  textArea = d3.select("#header_div").append("svg")
    .attr("width", d3.select("#header_div").node().clientWidth)
    .attr("height", d3.select("#header_div").node().clientHeight / 2);

  projection = d3.geoMercator()
    .center([31, 48.5])                // GPS of location to zoom on
    .scale(2300)                       // This is like the zoom
    .translate([mapWidth / 2, mapHeight / 2])


  types = events.map(a => a.event_type);
  types = d3.set(types).values();

  allTypes = types;

  regions = events.map(a => a.admin1);
  regions = d3.set(regions).values();

  function unique(arr, keyProps) {
    const kvArray = arr.map(entry => {
      const key = keyProps.map(k => entry[k]).join('|');
      return [key, entry];
    });
    const map = new Map(kvArray);
    return Array.from(map.values());
  }
  positions = events.map(o => { return { long: o.long, lat: o.lat } });
  positions = unique(positions, ['long', 'lat']);

  // set the ranges
  color = d3.scaleOrdinal()
    .domain(allTypes)
    .range(['#00296b', 'blue', '#00509d', '#fdc500', '#ffd500'])
  var sumstat = d3.nest() // nest function allows to group the calculation per level of a factor
    .key(function (d) { return d.admin1; })
    .entries(events);

  var regions_div = d3.selectAll("path");
  function equalToEventTarget() {
    return this == d3.event.target;
  }

  svg = d3.select("body").select('#map_div')
    .attr("width", mapWidth)
    .attr("height", mapHeight)
    .style("display", "inline-block")

  path = d3.geoPath()
    .projection(projection);

  g = svg.append("g");
  var date_array = line_chart_data(events, selectedRegion);

  svg3 = d3.select("#bar_chart_div")

    .attr("width", chartWidth + margin.left + margin.right)
    .attr("height", chartHeight + margin.top + margin.bottom)
    .style("display", "inline-block")
    .append("g")
    .attr("transform",
      "translate(" + margin.left + "," + margin.top + ")")
  x2 = d3.scaleTime()
    .domain(d3.extent(date_array, function (d) { return d.date; }))
    .range([0, width - mapWidth - margin.left - margin.right]);
  dateBegin = x2.domain()[0];
  dateEnd = x2.domain()[1];


  d3.select("#range-label")
    .text(dateBegin.getDate() +
      "/" + (dateBegin.getMonth() + 1) +
      "/" + dateBegin.getFullYear() + " - " + dateEnd.getDate() +
      "/" + (dateEnd.getMonth() + 1) +
      "/" + dateEnd.getFullYear());

  minRange = x2.domain()[0].getTime();
  maxRange = x2.domain()[1].getTime();

  var slider = createD3RangeSlider(minRange, maxRange, "#slider-container");
  slider.onChange(function (newRange) {
    dateBegin = new Date(newRange.begin);
    dateEnd = new Date(newRange.end);

    d3.select("#range-label")
      .text(dateBegin.getDate() +
        "/" + (dateBegin.getMonth() + 1) +
        "/" + dateBegin.getFullYear() + " - " + dateEnd.getDate() +
        "/" + (dateEnd.getMonth() + 1) +
        "/" + dateEnd.getFullYear());
    drawEvents();
    drawBarChart();
  });

  slider.range(minRange, maxRange);

  svg2 = d3.select("#line_chart_div")

    .attr("width", chartWidth + margin.left + margin.right)
    .attr("height", chartHeight + margin.top + margin.bottom)
    .style("display", "inline-block")
    .append("g")
    .attr("transform",
      "translate(" + margin.left + "," + margin.top + ")")
  d3.select("body").select("#header_div").on("click", function () {
    var outside = regions_div.filter(equalToEventTarget).empty();
    if (outside) {
      if (selectedRegion != '') {
        let el1 = d3.select("#" + selectedRegion)
          .attr("stroke", "lightgray")
          .attr("stroke-width", 5)
          .attr('opacity', '1');

      }
      selectedRegion = '';
    }
  });
  function sleep2(delay) {
    var start = new Date().getTime();
    while (new Date().getTime() < start + delay);
  }

  d3.select("body").select("#play-button").on("click", function () {

    const diffTime = Math.abs(dateEnd - dateBegin);
    slider.range(minRange, dateBegin.getTime());
    console.log('Play');
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    var nextDate = dateBegin;
    for (var i = 0; i < diffDays; i++) {

      setTimeout(function () {
        var previousDate = nextDate;
        nextDate = new Date(nextDate.getTime() + (3600 * 1000 * 24));

        slider.range(previousDate.getTime(), nextDate.getTime());
      }, 1000)
    }
  }
    //dateBegin = new Date(dateBegin.getTime() + ( 3600 * 1000 * 24));

    // while(dateBegin.getTime() < maxRange){
    //   for(var i = 0; i <5; i++){
    // dateBegin = new Date(dateBegin.getTime() + ( 3600 * 1000 * 24));
    // slider.range(dateBegin.getTime(), dateBegin.getTime());
    // }
  );
}

function visualization() {

  drawTextInfo();
  drawLineChart();
  drawBarChart();
}
/*----------------------
TEXT INFORMATION
----------------------*/
function drawTextInfo() {
  // Draw headline
  textArea.append("text")
    .attrs({ x: 100, y: "1.5em", class: "headline" })
    .text("Russian invasion of Ukraine 2022")
    .attr('fill', "white")
  // //Draw source
  // textArea.append("text")
  //   .attrs({ dx: 10, dy: 10, class: "subline" })
  //   .text("Data source: mapakriminality.cz")
  //   .on("click", function () { window.open("https://www.mapakriminality.cz/data/"); });;

}
function drawMap() {

  d3.json("ukraine-with-regions_1530.geojson", function (error, features) {

    // Add a scale for bubble size
    g.selectAll("path")
      .data(features.features)
      .enter().append("path")
      .attr('class', 'region')
      .attr('id', function (d) {
        return d.properties.name.replaceAll(" Oblast", "")
      })
      .attr("d", path)
      .attr("stroke", "lightgray")
      .on("click", region_clicked)

    var legend = svg.selectAll(".legend")
      .data(color.domain())
      .enter().append("g")
      .classed("legend", true)
      .attr("transform", function (d, i) {
        return "translate(5," + (i * 20 + mapHeight - 100) + ")";
      });
    // .attr("transform", function (d) {
    //   return "translate(" + projection([30, -10]) + ")";
    // })
    // .attr("x", 10)
    // .attr("cy", function (d, i) {return (i*20 + mapHeight)})

    legend.append("rect")
      .attr("x", 10)
      .attr("width", 10)
      .attr("height", 10)
      .style("fill", color);

    legend.on("click", function (type) {
      // dim all of the icons in legend
      d3.selectAll(".legend")
      //.style("opacity", 0.3);
      // make the one selected be un-dimmed
      currentOpacity = d3.select(this).style("opacity")

      d3.select(this)
        .style("opacity", currentOpacity == 1 ? 0.3 : 1);
      var foundType, index;
      d3.selectAll("." + type.replaceAll('/', '').replaceAll(" ", '')).transition().duration(1000).style("opacity", currentOpacity == 1 ? 0 : 1)
      var found = false;
      for (var t = 0; t < types.length; t++) {
        if (types[t] == type) {
          found = true;
          index = t;
        }
      }
      if (found)

        types.splice(index, 1);
      else
        types.push(type);
      console.log(types)
      drawBarChart();
      drawLineChart();



      //.style("opacity", 1) // need this line to unhide dots
      // .style("fill", color(type))
      // apply stroke rule
    });
    legend.append("text")
      .attr("x", 26)
      .attr("dy", ".9em")
      .attr("fill", "white")
      .attr("font-size", 10)
      .text(function (d) {
        return d;
      });
    drawEvents();

  });

  var zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on('zoom', function () {
      g.attr('transform', d3.event.transform);
    });



  svg.call(zoom);
}

function drawEvents() {
  var map_data = map_data_func(events);

  var maxSizeCalc = function (data) {
    return d3.max(data, function (d) { return d.num_events; });
  }
  size = d3.scaleLinear()
    .domain([1, maxSizeCalc(map_data)])  // What's in the data
    .range([3, 20])  // Size in pixel
  svg.selectAll('circle').remove()

  //var g2 = svg.append("g"); // pie charts
  var arc = d3.arc()
    .innerRadius(0)
    //.outerRadius(20)
    .outerRadius(function (d, i) {
      return Math.max(5, Math.round(size(d.data)))
    });

  var pie = d3.pie()
    .sort(null)
    .value(function (d) { return d; });

  var color10 = d3.schemeCategory10;
  // var pie_data = function (d) {
  //   var result = [];
  //   for (var i = 0; i < types.length; i++) {
  //     result.push(d[types[i]]);
  //   }
  //   return result;
  // };
  // var pies = svg.selectAll('.pie')
  //   .data(map_data)
  //   .enter()
  //   .append('g')
  //   .attr('class', 'pie')
  //   .attr("transform", function (d) {
  //     return "translate(" + projection([d.long, d.lat]) + ")";
  //   });
  // pies.selectAll('.slice')
  //   .data(function (d) {
  //     //return pie([d[types[0], d[types[1], d[types[2]]]]]);
  //     return pie(pie_data(d));
  //   })
  //   .enter()
  //   .append('path')
  //   .attr('d', arc)
  //   .style('fill', function (d, i) {
  //     return color(i);
  //   });

  g
    .selectAll("circle")
    .data(map_data)
    .enter()
    // .append('path')
    // .attr('d', d3.arc()
    //   .innerRadius(100)         // This is the size of the donut hole
    //   .outerRadius(function (d) {
    //      return size(circle_size(d))})
    // )
    .append("circle")
    .attr("transform", function (d) {
      return "translate(" + projection([d.long, d.lat]) + ")";
    })
    .attr("class", function (d) { return d.event_type.replaceAll('/', '').replaceAll(" ", '') })
    .attr("r", function (d) {
      return Math.max(0, size(d.num_events))
    })
    .style("fill", function (d) { return color(d.event_type) })
    //.attr("stroke", function (d) { return "red" })
    .attr("stroke-width", 3)
  // .attr("fill-opacity", .4)
}

function drawLineChart() {
  svg2.selectAll("*").remove()

  var max_y_linechart = function (d) {

    var value = 0;
    for (let t = 0; t < types.length; t++) {
      for (let k = 0; k < d.length; k++) {

        value = Math.max(value, d[k][types[t]]);
      }
    }
    return value;
  }
  var line_chart = line_chart_data(events, selectedRegion);
  lineChartRegion = selectedRegion;
  // if (max_y_linechart(line_chart) < 2) {
  //   line_chart = line_chart_data(events, '');
  //   lineChartRegion = 'Ukraine';
  // }

  var y = d3.scaleLinear()
    .domain([0, max_y_linechart(line_chart)])
    .range([chartHeight, 0]);

  var x = d3.scaleTime()
    .domain(d3.extent(line_chart, function (d) { return d.date; }))
    .range([0, width - mapWidth - margin.left - margin.right])

  var valueline = function (t) {
    return d3.line()
      .x(function (d) {
        return x(d.date);
      })
      .y(function (d) { return y(d[types[t]]) });
  }
  // Scale the range of the data
  for (var t = 0; t < types.length; t++) {
    svg2.append("path")
      .data([line_chart])
      .attr("fill", "none")

      .attr("stroke", function (d) { return color(types[t]) })
      .attr("stroke-width", 1.5)
      .attr("d", valueline(t))
  }

  svg2.append("g")
    .transition()
    .duration(1000)
    .attr("class", "axisWhite")
    .call(d3.axisLeft(y));
  svg2.append("g")
    .attr("transform", "translate(0," + chartHeight + ")")
    .call(d3.axisBottom(x).tickSizeOuter(0))
    .selectAll("text")
    .attr("class", "axisWhite")
    .attr("fill", "white")
    .attr("transform", "translate(-10,10)rotate(-45)")


  svg2.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x", 0 - (chartHeight / 2))
    .attr("dy", "1em")
    .attr("class", "axisWhite")
    .style("text-anchor", "middle")
    .text("Num of Events")
    .attr('fill', 'white');

  if (lineChartRegion == '')
    lineChartRegion = 'Ukraine';
  svg2.append("text")
    //.attr("transform", "rotate(0)")
    .attr("y", 0 - margin.top)
    .attr("x", margin.left)
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text("Region: " + lineChartRegion)
    .attr('fill', 'white');
}

function drawBarChart() {

  barplot_data = barplot_data_func(events, regions);

  var max_y_barchart = function (data) {
    return d3.max(data, function (d) { return d.num_events; });
  }

  // List of groups = species here = value of the first column called group -> I show them on the X axis
  svg3.selectAll("*").remove()
  topRegions = findTopRegions(events);
  var x = d3.scaleBand()
    .domain(topRegions)
    .range([0, width - mapWidth - margin.left - margin.right])
    .padding([0.2])

  svg3.append("g")
    .attr("transform", "translate(0," + chartHeight + ")")
    .call(d3.axisBottom(x).tickSizeOuter(0))
    .selectAll("text")
    .attr("transform", "translate(-10,10)rotate(-45)")
    .attr("class", "axisWhite")
    .attr("fill", "white")
  // Add Y axis
  var y = d3.scaleLinear()
    .domain([0, max_y_barchart(regions_num_events)])
    .range([chartHeight, 0]);
  svg3.append("g")
    .transition()
    .attr("class", "axisWhite")
    .duration(1000)
    .call(d3.axisLeft(y))



  var sorted_barplot_data = barplot_data.filter(x =>
    topRegions.indexOf(x.region) >= 0);

  var stackedData = d3.stack()
    .keys(types)
    (sorted_barplot_data)

  // Show the bars
  svg3.append("g")
    .selectAll("g")
    // Enter in the stack data = loop key per key = group per group
    .data(stackedData)
    .enter().append("g")
    .attr("fill", function (d) { return color(d.key); })
    .selectAll("rect")
    // enter a second time = loop subgroup per subgroup to add all rectangles
    .data(function (d) { return d; })
    .enter().append("rect")

    .attr("x", function (d) { return x(d.data.region); })
    .attr("y", function (d) { return y(d[1]); })
    .attr("height", function (d) { return y(d[0]) - y(d[1]); })
    .attr("width", x.bandwidth())
    .attr("class", function (d) { return d.data.region + '_rect' })
  svg3.selectAll("rect")
    .on("click", barchart_clicked)

  svg3.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x", 0 - (chartHeight / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text("Num of Events")
    .attr('fill', 'white');
}

function region_clicked(event, d) {
  previousSelectedRegion = selectedRegion;
  if (event.defaultPrevented) return; // dragged
  if (selectedRegion != '') {
    let el1 = d3.select("#" + selectedRegion)
      .attr("stroke", "lightgray")
      .attr("fill", "black")
      .attr('opacity', '1');
  }
  let el = d3.select(this)
    .attr("fill", "lightgray")
    .attr('opacity', '0.5')
  selectedRegion = el.attr('id');
  drawLineChart();
  selectBarChart(previousSelectedRegion, selectedRegion);
}
function selectBarChart(previousSelectedRegion, region) {
  d3.selectAll("." + previousSelectedRegion + "_rect")
    .attr("stroke", "none");
  d3.selectAll("." + region + "_rect")
    .attr("stroke", "white")
    .attr("stroke-width", 2)
}
function barchart_clicked(event, d) {
  previousSelectedRegion = selectedRegion;
  if (event.defaultPrevented) return; // dragged
  if (selectedRegion != '') {
    let el1 = d3.select("#" + selectedRegion)
      .attr("fill", "lightgray")
      .attr('opacity', '1');
  }
  let el = d3.select(th)
  selectedRegion = el.attr('class').replaceAll("_rect", '');
  el = d3.select("#" + selectedRegion)
    .attr("fill", "#c20000")
    .attr('opacity', '0.5')
  drawLineChart();
  selectBarChart(previousSelectedRegion, selectedRegion);
}