(function(){
    //UI configuration
    var itemSize = 18,
        cellSize = itemSize-1,
        width =  height = document.getElementsByClassName("days-hours-heatmap")[0].offsetWidth*0.6 ;
        margin = {top:20,right:20,bottom:20,left:25};

    //formats
    var hourFormat = d3.time.format('%H'),
        dayFormat = d3.time.format('%j'),
        timeFormat = d3.time.format('%Y-%m-%dT%X'),
        monthDayFormat = d3.time.format('%m-%d');

    //data vars for rendering
    var dateExtent = null,
        data = null,
        dayOffset = 0,
        colorCalibration = ['#f6faaa','#FEE08B','#FDAE61','#F46D43','#D53E4F','#9E0142'],
        dailyValueExtent = {};

    //axises and scales 轴和刻度
    var axisWidth = 0 ,
        axisHeight = itemSize*24,
        xAxisScale = d3.time.scale(),
        xAxis = d3.svg.axis()
            .orient('top')//设置或者取得轴的方向
            .ticks(d3.time.days,3)//控制轴的刻度如何生成
            .tickFormat(monthDayFormat),//重载标签的刻度格式化。
        yAxisScale = d3.scale.linear()//构建一个线性比例尺。
            .range([0,axisHeight])
            .domain([0,24]),
        yAxis = d3.svg.axis()
            .orient('left')
            .ticks(5)
            .tickFormat(d3.format('02d'))
            .scale(yAxisScale);

    initCalibration();//初始化标尺
    //热图容器大小
    var svg = d3.select('[role="heatmap"]');
    var heatmap = svg
        .attr('style',"width:"+width+"px;height:"+width+"px")
        .append('g')
        .attr('width',width-margin.left-margin.right)
        .attr('height',height-margin.top-margin.bottom)
        .attr('transform','translate('+margin.left+','+margin.top+')');
    var rect = null;
    //解析json
    d3.json('pm25.json',function(err,data){
        data = data.data;
        data.forEach(function(valueObj){
            valueObj['date'] = timeFormat.parse(valueObj['timestamp']);//保存时间戳
            var day = valueObj['day'] = monthDayFormat(valueObj['date']);//格式化日期

            var dayData = dailyValueExtent[day] = (dailyValueExtent[day] || [1000,-1]);
         //TODO:   console.log(dayData);
            var pmValue = valueObj['value']['PM2.5'];
            dayData[0] = d3.min([dayData[0],pmValue]);
            dayData[1] = d3.max([dayData[1],pmValue]);
        });

        dateExtent = d3.extent(data,function(d){
            return d.date;
        });

        axisWidth = itemSize*(dayFormat(dateExtent[1])-dayFormat(dateExtent[0])+1);

        //render axises
        xAxis.scale(xAxisScale.range([0,axisWidth]).domain([dateExtent[0],dateExtent[1]]));
        svg.append('g')
            .attr('transform','translate('+margin.left+','+margin.top+')')
            .attr('class','x axis')
            .call(xAxis)
            .append('text')
            .text('date')
            .attr('transform','translate('+axisWidth+',-10)');

        svg.append('g')
            .attr('transform','translate('+margin.left+','+margin.top+')')
            .attr('class','y axis')
            .call(yAxis)
            .append('text')
            .text('time')
            .attr('transform','translate(-10,'+axisHeight+') rotate(-90)');

        //render heatmap rects
        dayOffset = dayFormat(dateExtent[0]);
        rect = heatmap.selectAll('rect')
            .data(data)
            .enter().append('rect')
            .attr('width',cellSize)
            .attr('height',cellSize)
            .attr('x',function(d){
                return itemSize*(dayFormat(d.date)-dayOffset);
            })
            .attr('y',function(d){
                return hourFormat(d.date)*itemSize;
            })
            .attr('fill','#ffffff');

        rect.filter(function(d){ return d.value['PM2.5']>0;})
            .append('title')
            .text(function(d){
                return monthDayFormat(d.date)+' '+d.value['PM2.5'];
            });

        renderColor();
    });

    function initCalibration(){
        d3.select('[role="calibration"] [role="example"]').select('svg')
            .selectAll('rect').data(colorCalibration).enter()
            .append('rect')
            .attr('width',cellSize)
            .attr('height',cellSize)
            .attr('x',function(d,i){
                return i*itemSize;
            })
            .attr('fill',function(d){
                return d;
            });

        //bind click event
        d3.selectAll('[role="calibration"] [name="displayType"]').on('click',function(){
            renderColor();
        });
    }

    function renderColor(){
        var renderByCount = document.getElementsByName('displayType')[0].checked;

        rect
            .filter(function(d){
                return (d.value['PM2.5']>=0);
            })
            .transition()
            .delay(function(d){
                return (dayFormat(d.date)-dayOffset)*15;
            })
            .duration(500)
            .attrTween('fill',function(d,i,a){
                //choose color dynamicly
                var colorIndex = d3.scale.quantize()
                    .range([0,1,2,3,4,5])
                    .domain((renderByCount?[0,500]:dailyValueExtent[d.day]));

                return d3.interpolate(a,colorCalibration[colorIndex(d.value['PM2.5'])]);
            });
    }

    //extend frame height in `http://bl.ocks.org/`
    d3.select(self.frameElement).style("height", "600px");
})();